import type { AiricToolKind } from "./tool.js";

export type ToolCallPresentation = {
  title: string;
  kind: AiricToolKind | "other";
  rawInput: Record<string, unknown>;
  locations?: Array<{ path: string }>;
};
