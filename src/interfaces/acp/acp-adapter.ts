import * as acp from "@agentclientprotocol/sdk";
import { randomUUID } from "node:crypto";
import type { FileSystemPort } from "../../application/ports/file-system-port.js";
import { OpenAiLlmFactory } from "../../infrastructure/llm/openai-llm.js";
import { YamlConfigLoader } from "../../infrastructure/config/yaml-config-loader.js";
import { SessionStoreFactory } from "../../infrastructure/store/json-session-store.js";
import { bootstrapWorkspace } from "../../application/use-cases/bootstrap-workspace.js";
import { SendMessageUseCase } from "../../application/use-cases/send-message.js";
import { WorkspaceRuntimeLoader } from "../../application/services/workspace-runtime-loader.js";
import { createSession } from "../../domain/session/session.js";
import { extractUserMessage } from "./acp-message-mapper.js";

type SessionState = {
  pendingPrompt: AbortController | null;
};

export class AcpAdapter {
  private readonly sessions = new Map<string, SessionState>();
  private readonly workspaceSessions = new Map<string, string>();
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
        version: "0.1.0",
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

      const sendMessage = new SendMessageUseCase({
        sessionStore,
        llm,
        runtime,
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

  async cancel(params: acp.CancelNotification): Promise<void> {
    this.sessions.get(params.sessionId)?.pendingPrompt?.abort();
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
    .onNotification("session/cancel", (ctx) => adapter.cancel(ctx.params));
}
