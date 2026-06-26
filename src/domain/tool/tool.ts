import type { AiricToolResult } from "./tool-result.js";
import type { ToolCallPresentation } from "./tool-presentation.js";

export type AiricToolKind =
  | "read"
  | "edit"
  | "delete"
  | "move"
  | "search"
  | "execute"
  | "other";

export type AiricToolContext = {
  cwd: string;
  sessionId: string;
};

export type AiricToolUpdate = {
  content: AiricToolResult["content"];
  details?: Record<string, unknown>;
};

export type AiricToolPolicy = "none" | "mutating";
export type AiricToolConfirmation = "none" | "diff";

export type AiricToolDefinition = {
  name: string;
  kind: AiricToolKind;
  description: string;
  inputSchema: Record<string, unknown>;
  policy?: AiricToolPolicy;
  confirmation?: AiricToolConfirmation;
  sequential?: boolean;
  present?: (args: Record<string, unknown>) => ToolCallPresentation;
  execute: (
    input: Record<string, unknown>,
    context: AiricToolContext,
    signal?: AbortSignal,
    onUpdate?: (update: AiricToolUpdate) => void,
  ) => Promise<AiricToolResult>;
};

export function requiresPolicyCheck(tool: AiricToolDefinition): boolean {
  return tool.policy === "mutating";
}

export function requiresDiffConfirmation(tool: AiricToolDefinition): boolean {
  return tool.confirmation === "diff";
}
