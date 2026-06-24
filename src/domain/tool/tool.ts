import type { AiricToolResult } from "./tool-result.js";

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

export type AiricToolDefinition<TInput = unknown> = {
  name: string;
  kind: AiricToolKind;
  description: string;
  inputSchema: Record<string, unknown>;
  promptSnippet?: string;
  promptGuidelines?: string[];
  sequential?: boolean;
  execute: (
    input: TInput,
    context: AiricToolContext,
    signal?: AbortSignal,
    onUpdate?: (update: AiricToolUpdate) => void,
  ) => Promise<AiricToolResult>;
};
