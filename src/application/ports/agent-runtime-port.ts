import type { TranscriptMessage } from "../../domain/agent/transcript.js";
import type { PendingEdit } from "../../domain/tool/pending-edit.js";
import type { AiricConfig } from "./config-loader-port.js";
import type {
  KernelToolRegistryPort,
} from "../services/kernel-tool-registry.js";

export type AgentRuntimeEvent =
  | { type: "text_delta"; text: string }
  | {
      type: "tool_call_start";
      toolCallId: string;
      name: string;
      title: string;
      kind: "read" | "edit" | "search" | "execute" | "other";
      rawInput: Record<string, unknown>;
      locations?: Array<{ path: string }>;
    }
  | {
      type: "tool_call_end";
      toolCallId: string;
      status: "completed" | "failed";
      content?: string;
      acpContent?: Array<
        | { type: "content"; content: { type: "text"; text: string } }
        | { type: "diff"; path: string; oldText: string | null; newText: string }
      >;
      rawOutput?: Record<string, unknown>;
    }
  | { type: "run_end"; assistantText: string };

export type EditPermissionGate = (
  edit: PendingEdit,
  toolCallId: string,
) => Promise<"allow" | "reject">;

export type AgentSystemContext = {
  systemPrompt: string;
  refreshSystemPrompt: () => Promise<string>;
};

export type AgentTurnInput = {
  sessionId: string;
  userMessage: string;
  priorMessages: TranscriptMessage[];
  llm: AiricConfig["llm"];
  systemContext: AgentSystemContext;
  session: import("../../domain/session/session.js").Session;
  tools: KernelToolRegistryPort;
  permissionGate?: EditPermissionGate;
  signal?: AbortSignal;
  onEvent: (event: AgentRuntimeEvent) => Promise<void>;
};

export type AgentTurnResult = {
  assistantText: string;
  turnMessages: TranscriptMessage[];
};

export type AgentCompleteInput = {
  llm: AiricConfig["llm"];
  systemPrompt: string;
  messages: TranscriptMessage[];
  prompt: string;
  signal?: AbortSignal;
};

export interface AgentRuntimePort {
  runTurn(input: AgentTurnInput): Promise<AgentTurnResult>;
  complete(input: AgentCompleteInput): Promise<string>;
  abort(sessionId: string): void;
}
