import type { PendingEdit } from "../../domain/tool/pending-edit.js";
import type { LlmPort, LlmToolCall } from "../ports/llm-port.js";
import type { FileSystemPort } from "../ports/file-system-port.js";
import type { SessionStorePort } from "../ports/session-store-port.js";
import { RuntimeContextBuilder } from "../services/runtime-context-builder.js";
import type { WorkspaceRuntime } from "../services/workspace-runtime-loader.js";
import { loadCurrentDocumentContext } from "../services/current-document-context.js";
import { KERNEL_TOOL_DEFINITIONS } from "../services/kernel-tools.js";
import {
  FileToolExecutor,
  type ToolExecutionEvents,
} from "../services/file-tool-executor.js";
import type { EditStore } from "../services/edit-store.js";
import type { EditLog } from "../services/edit-log.js";
import { DiffService } from "../../infrastructure/diff/diff-service.js";

export type StreamCallback = (chunk: string) => Promise<void>;

export type ToolBridge = {
  onToolCallStart: (toolCall: {
    toolCallId: string;
    name: string;
    title: string;
    kind: "read" | "edit" | "search" | "other";
    rawInput: Record<string, unknown>;
    locations?: Array<{ path: string }>;
  }) => Promise<void>;
  onToolCallUpdate: (update: {
    toolCallId: string;
    status: "completed" | "failed";
    content?: string;
    rawOutput?: Record<string, unknown>;
  }) => Promise<void>;
  onProposeEdit: (edit: PendingEdit, toolCallId: string) => Promise<"allow" | "reject">;
};

export type SendMessageInput = {
  sessionId: string;
  userMessage: string;
  signal?: AbortSignal;
  onChunk: StreamCallback;
  toolBridge?: ToolBridge;
};

export type SendMessageDeps = {
  sessionStore: SessionStorePort;
  llm: LlmPort;
  runtime: WorkspaceRuntime;
  fs: FileSystemPort;
  editStore: EditStore;
  editLog: EditLog;
  contextBuilder?: RuntimeContextBuilder;
};

const MAX_TOOL_ROUNDS = 8;

export class SendMessageUseCase {
  private readonly contextBuilder: RuntimeContextBuilder;
  private readonly fileTools: FileToolExecutor;

  constructor(private readonly deps: SendMessageDeps) {
    this.contextBuilder = deps.contextBuilder ?? new RuntimeContextBuilder();
    this.fileTools = new FileToolExecutor({
      fs: deps.fs,
      sessionStore: deps.sessionStore,
      diffService: new DiffService(),
      editStore: deps.editStore,
      editLog: deps.editLog,
    });
  }

  async execute(input: SendMessageInput): Promise<string> {
    const session = await this.deps.sessionStore.get(input.sessionId);
    if (!session) {
      throw new Error(`Session not found: ${input.sessionId}`);
    }

    const roleId = session.roleId ?? this.deps.runtime.config.defaultRole;
    const roleSpec = this.deps.runtime.specRegistry.require(roleId);
    const currentDocument = await loadCurrentDocumentContext(
      this.deps.fs,
      session,
      this.deps.runtime.specRegistry,
    );

    session.messages.push({ role: "user", content: input.userMessage });

    let messages = this.contextBuilder.build({
      baseInstruction: this.deps.runtime.baseInstruction,
      roleSpec,
      chatHistory: session.messages,
      currentDocument,
    });

    let assistantText = "";

    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const result = await this.deps.llm.chatWithTools(
        messages,
        KERNEL_TOOL_DEFINITIONS,
        { signal: input.signal },
      );

      if (result.toolCalls.length === 0) {
        assistantText = result.text;
        await streamText(assistantText, input.onChunk);
        break;
      }

      messages.push({
        role: "assistant",
        content: result.text || null,
        toolCalls: result.toolCalls,
      });

      for (const toolCall of result.toolCalls) {
        const toolResult = await this.runToolCall(
          session,
          toolCall,
          input.toolBridge,
        );

        messages.push({
          role: "tool",
          toolCallId: toolCall.id,
          content: toolResult,
        });
      }

      if (round === MAX_TOOL_ROUNDS - 1) {
        assistantText =
          "I reached the tool call limit for this turn. Please continue in a follow-up message.";
        await streamText(assistantText, input.onChunk);
      }
    }

    session.messages.push({ role: "assistant", content: assistantText });
    session.updatedAt = new Date().toISOString();
    session.roleId = roleId;

    await this.deps.sessionStore.save(session);

    return assistantText;
  }

  private async runToolCall(
    session: import("../../domain/session/session.js").Session,
    toolCall: LlmToolCall,
    toolBridge?: ToolBridge,
  ): Promise<string> {
    const meta = describeToolCall(toolCall);

    if (toolBridge) {
      await toolBridge.onToolCallStart({
        toolCallId: toolCall.id,
        name: toolCall.name,
        title: meta.title,
        kind: meta.kind,
        rawInput: meta.rawInput,
        locations: meta.locations,
      });
    }

    try {
      const events: ToolExecutionEvents = {
        onProposeEdit: async (edit, toolCallId) => {
          if (!toolBridge) {
            return "reject";
          }
          return toolBridge.onProposeEdit(edit, toolCallId);
        },
      };

      const result = await this.fileTools.execute(session, toolCall, events);

      if (toolBridge) {
        await toolBridge.onToolCallUpdate({
          toolCallId: toolCall.id,
          status: "completed",
          content: result,
          rawOutput: { result },
        });
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (toolBridge) {
        await toolBridge.onToolCallUpdate({
          toolCallId: toolCall.id,
          status: "failed",
          content: message,
          rawOutput: { error: message },
        });
      }
      return `Tool failed: ${message}`;
    }
  }
}

function describeToolCall(toolCall: LlmToolCall): {
  title: string;
  kind: "read" | "edit" | "search" | "other";
  rawInput: Record<string, unknown>;
  locations?: Array<{ path: string }>;
} {
  const args = safeParseJson(toolCall.arguments);
  const path = typeof args.path === "string" ? args.path : undefined;

  switch (toolCall.name) {
    case "list_files":
      return {
        title: `List files in ${path ?? "."}`,
        kind: "read",
        rawInput: args,
        locations: path ? [{ path }] : undefined,
      };
    case "read_file":
      return {
        title: `Read ${path ?? "file"}`,
        kind: "read",
        rawInput: args,
        locations: path ? [{ path }] : undefined,
      };
    case "create_file":
      return {
        title: `Create ${path ?? "file"}`,
        kind: "edit",
        rawInput: args,
        locations: path ? [{ path }] : undefined,
      };
    case "propose_edit":
      return {
        title: `Edit ${path ?? "file"}`,
        kind: "edit",
        rawInput: args,
        locations: path ? [{ path }] : undefined,
      };
    case "search_text":
      return {
        title: `Search for "${String(args.query ?? "")}"`,
        kind: "search",
        rawInput: args,
      };
    default:
      return {
        title: toolCall.name,
        kind: "other",
        rawInput: args,
      };
  }
}

function safeParseJson(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function streamText(text: string, onChunk: StreamCallback): Promise<void> {
  if (!text) {
    return;
  }

  const chunkSize = 24;
  for (let index = 0; index < text.length; index += chunkSize) {
    await onChunk(text.slice(index, index + chunkSize));
  }
}
