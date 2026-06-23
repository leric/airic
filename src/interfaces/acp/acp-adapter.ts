import * as acp from "@agentclientprotocol/sdk";
import { randomUUID } from "node:crypto";
import type { FileSystemPort } from "../../application/ports/file-system-port.js";
import { OpenAiLlmFactory } from "../../infrastructure/llm/openai-llm.js";
import { YamlConfigLoader } from "../../infrastructure/config/yaml-config-loader.js";
import { SessionStoreFactory } from "../../infrastructure/store/json-session-store.js";
import { bootstrapWorkspace } from "../../application/use-cases/bootstrap-workspace.js";
import {
  SendMessageUseCase,
  type ToolBridge,
} from "../../application/use-cases/send-message.js";
import { WorkspaceRuntimeLoader } from "../../application/services/workspace-runtime-loader.js";
import { createSession } from "../../domain/session/session.js";
import { extractUserMessage, fileUriToPath } from "./acp-message-mapper.js";
import { EditStore } from "../../application/services/edit-store.js";
import { EditLog } from "../../application/services/edit-log.js";
import { OpenDocumentUseCase } from "../../application/use-cases/file-editing.js";
import type { PendingEdit } from "../../domain/tool/pending-edit.js";

type SessionState = {
  pendingPrompt: AbortController | null;
};

export class AcpAdapter {
  private readonly sessions = new Map<string, SessionState>();
  private readonly workspaceSessions = new Map<string, string>();
  private readonly editStore = new EditStore();
  private readonly fs: FileSystemPort;
  private readonly configLoader: YamlConfigLoader;
  private readonly sessionStoreFactory: SessionStoreFactory;
  private readonly runtimeLoader: WorkspaceRuntimeLoader;
  private readonly llmFactory: OpenAiLlmFactory;

  constructor(fs: FileSystemPort) {
    this.fs = fs;
    this.configLoader = new YamlConfigLoader(fs);
    this.sessionStoreFactory = new SessionStoreFactory(fs);
    this.runtimeLoader = new WorkspaceRuntimeLoader(fs, this.configLoader);
    this.llmFactory = new OpenAiLlmFactory();
  }

  async initialize(
    _params: acp.InitializeRequest,
  ): Promise<acp.InitializeResponse> {
    return {
      protocolVersion: acp.PROTOCOL_VERSION,
      agentCapabilities: {
        loadSession: false,
        promptCapabilities: {
          embeddedContext: true,
        },
      },
      agentInfo: {
        name: "airic",
        version: "0.2.0",
      },
    };
  }

  async authenticate(
    _params: acp.AuthenticateRequest,
  ): Promise<acp.AuthenticateResponse | void> {
    return {};
  }

  async setSessionMode(
    _params: acp.SetSessionModeRequest,
  ): Promise<acp.SetSessionModeResponse> {
    return {};
  }

  async newSession(
    params: acp.NewSessionRequest,
  ): Promise<acp.NewSessionResponse> {
    const workspaceRoot = params.cwd;
    await bootstrapWorkspace(this.fs, workspaceRoot);

    const runtime = await this.runtimeLoader.load(workspaceRoot);
    const sessionStore = this.sessionStoreFactory.forWorkspace(workspaceRoot);

    const sessionId = randomUUID();
    const session = createSession(
      sessionId,
      workspaceRoot,
      runtime.config.defaultRole,
    );

    await sessionStore.save(session);

    this.sessions.set(sessionId, { pendingPrompt: null });
    this.workspaceSessions.set(sessionId, workspaceRoot);

    return { sessionId };
  }

  async prompt(
    params: acp.PromptRequest,
    cx: acp.AgentContext,
  ): Promise<acp.PromptResponse> {
    const sessionState = this.sessions.get(params.sessionId);
    if (!sessionState) {
      throw new Error(`Session ${params.sessionId} not found`);
    }

    const workspaceRoot = this.workspaceSessions.get(params.sessionId);
    if (!workspaceRoot) {
      throw new Error(`Workspace root not found for session ${params.sessionId}`);
    }

    sessionState.pendingPrompt?.abort();
    sessionState.pendingPrompt = new AbortController();

    const userMessage = extractUserMessage(params.prompt);
    if (!userMessage) {
      return { stopReason: "end_turn" };
    }

    try {
      const runtime = await this.runtimeLoader.load(workspaceRoot);
      const sessionStore = this.sessionStoreFactory.forWorkspace(workspaceRoot);
      const llm = this.llmFactory.create(runtime.config);
      const editLog = new EditLog(this.fs, workspaceRoot);

      const sendMessage = new SendMessageUseCase({
        sessionStore,
        llm,
        runtime,
        fs: this.fs,
        editStore: this.editStore,
        editLog,
      });

      await sendMessage.execute({
        sessionId: params.sessionId,
        userMessage,
        signal: sessionState.pendingPrompt.signal,
        onChunk: async (text) => {
          await cx.notify(acp.methods.client.session.update, {
            sessionId: params.sessionId,
            update: {
              sessionUpdate: "agent_message_chunk",
              content: {
                type: "text",
                text,
              },
            },
          });
        },
        toolBridge: this.createToolBridge(params.sessionId, cx),
      });
    } catch (error) {
      if (sessionState.pendingPrompt.signal.aborted) {
        return { stopReason: "cancelled" };
      }
      throw error;
    } finally {
      sessionState.pendingPrompt = null;
    }

    return { stopReason: "end_turn" };
  }

  async didOpenDocument(params: acp.DidOpenDocumentNotification): Promise<void> {
    const workspaceRoot = this.workspaceSessions.get(params.sessionId);
    if (!workspaceRoot) {
      return;
    }

    const runtime = await this.runtimeLoader.load(workspaceRoot);
    const sessionStore = this.sessionStoreFactory.forWorkspace(workspaceRoot);
    const openDocument = new OpenDocumentUseCase({
      fs: this.fs,
      sessionStore,
      runtime,
    });

    await openDocument.execute(params.sessionId, fileUriToPath(params.uri));
  }

  async didFocusDocument(params: acp.DidFocusDocumentNotification): Promise<void> {
    const workspaceRoot = this.workspaceSessions.get(params.sessionId);
    if (!workspaceRoot) {
      return;
    }

    const runtime = await this.runtimeLoader.load(workspaceRoot);
    const sessionStore = this.sessionStoreFactory.forWorkspace(workspaceRoot);
    const openDocument = new OpenDocumentUseCase({
      fs: this.fs,
      sessionStore,
      runtime,
    });

    await openDocument.execute(params.sessionId, fileUriToPath(params.uri));
  }

  async cancel(params: acp.CancelNotification): Promise<void> {
    this.sessions.get(params.sessionId)?.pendingPrompt?.abort();
  }

  private createToolBridge(
    sessionId: string,
    cx: acp.AgentContext,
  ): ToolBridge {
    return {
      onToolCallStart: async (toolCall) => {
        await cx.notify(acp.methods.client.session.update, {
          sessionId,
          update: {
            sessionUpdate: "tool_call",
            toolCallId: toolCall.toolCallId,
            title: toolCall.title,
            kind: toolCall.kind,
            status: "in_progress",
            rawInput: toolCall.rawInput,
            locations: toolCall.locations,
          },
        });
      },
      onToolCallUpdate: async (update) => {
        await cx.notify(acp.methods.client.session.update, {
          sessionId,
          update: {
            sessionUpdate: "tool_call_update",
            toolCallId: update.toolCallId,
            status: update.status,
            content: update.content
              ? [
                  {
                    type: "content",
                    content: {
                      type: "text",
                      text: update.content,
                    },
                  },
                ]
              : undefined,
            rawOutput: update.rawOutput,
          },
        });
      },
      onProposeEdit: async (edit, toolCallId) => {
        return this.requestEditPermission(sessionId, cx, edit, toolCallId);
      },
    };
  }

  private async requestEditPermission(
    sessionId: string,
    cx: acp.AgentContext,
    edit: PendingEdit,
    toolCallId: string,
  ): Promise<"allow" | "reject"> {
    await cx.notify(acp.methods.client.session.update, {
      sessionId,
      update: {
        sessionUpdate: "tool_call_update",
        toolCallId,
        status: "pending",
        content: [
          {
            type: "content",
            content: {
              type: "text",
              text: edit.diff,
            },
          },
        ],
        rawOutput: {
          editId: edit.id,
          diff: edit.diff,
        },
      },
    });

    const response = await cx.request(
      acp.methods.client.session.requestPermission,
      {
        sessionId,
        toolCall: {
          toolCallId,
          title: `Apply edit to ${edit.path}`,
          kind: "edit",
          status: "pending",
          locations: [{ path: edit.path }],
          rawInput: {
            editId: edit.id,
            diff: edit.diff,
          },
        },
        options: [
          {
            kind: "allow_once",
            name: "Accept edit",
            optionId: "allow",
          },
          {
            kind: "reject_once",
            name: "Reject edit",
            optionId: "reject",
          },
        ],
      },
    );

    if (response.outcome.outcome === "cancelled") {
      return "reject";
    }

    return response.outcome.optionId === "allow" ? "allow" : "reject";
  }
}

export function createAcpAgentApp(adapter: AcpAdapter): acp.AgentApp {
  return acp
    .agent({ name: "airic" })
    .onRequest("initialize", (ctx) => adapter.initialize(ctx.params))
    .onRequest("session/new", (ctx) => adapter.newSession(ctx.params))
    .onRequest("authenticate", (ctx) => adapter.authenticate(ctx.params))
    .onRequest("session/set_mode", (ctx) =>
      adapter.setSessionMode(ctx.params),
    )
    .onRequest("session/prompt", (ctx) =>
      adapter.prompt(ctx.params, ctx.client),
    )
    .onNotification("session/cancel", (ctx) => adapter.cancel(ctx.params))
    .onNotification("document/didOpen", (ctx) =>
      adapter.didOpenDocument(ctx.params),
    )
    .onNotification("document/didFocus", (ctx) =>
      adapter.didFocusDocument(ctx.params),
    );
}
