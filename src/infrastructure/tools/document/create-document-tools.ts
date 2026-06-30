import type { AiricToolDefinition } from "../../../domain/tool/tool.js";
import type { DocumentToolDeps } from "./document-tool-deps.js";
import { createDocumentFocusTool } from "./document-focus-tool.js";

export function createDocumentTools(
  deps: DocumentToolDeps,
): AiricToolDefinition[] {
  return [createDocumentFocusTool(deps)];
}
