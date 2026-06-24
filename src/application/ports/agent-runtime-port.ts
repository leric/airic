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
      kind: "read" | "edit" | "search" | "other";
      rawInput: Record<string, unknown>;
      locations?: Array<{ path: string }>;
    }
  | {
      type: "tool_call_end";
      toolCallId: string;
      status: "completed" | "failed";
      content?: string;
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
  transcript: TranscriptMessage[];
};

export interface AgentRuntimePort {
  runTurn(input: AgentTurnInput): Promise<AgentTurnResult>;
  abort(sessionId: string): void;
}
