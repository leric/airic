import type { AiricToolDefinition } from "../../../domain/tool/tool.js";
import type { ProcessToolDeps } from "./process-tool-deps.js";
import { createProcessCancelTool } from "./process-cancel-tool.js";
import { createProcessCompleteTool } from "./process-complete-tool.js";
import { createProcessListTool } from "./process-list-tool.js";
import { createProcessStartTool } from "./process-start-tool.js";
import { createProcessStatusTool } from "./process-status-tool.js";

export function createProcessTools(deps: ProcessToolDeps): AiricToolDefinition[] {
  return [
    createProcessStartTool(deps),
    createProcessCompleteTool(deps),
    createProcessCancelTool(deps),
    createProcessStatusTool(deps),
    createProcessListTool(deps),
  ];
}
