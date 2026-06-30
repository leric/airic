import type { AiricToolDefinition } from "../../../domain/tool/tool.js";
import { createHistoryMarkTool } from "./history-mark-tool.js";
import { createHistoryMoveCursorTool } from "./history-move-cursor-tool.js";
import { createHistoryReadTreeTool } from "./history-read-tree-tool.js";
import { createHistorySummarizeTool } from "./history-summarize-tool.js";
import type { HistoryToolDeps } from "./history-tool-deps.js";

export function createHistoryTools(deps: HistoryToolDeps): AiricToolDefinition[] {
  return [
    createHistoryReadTreeTool(deps),
    createHistoryMoveCursorTool(deps),
    createHistorySummarizeTool(deps),
    createHistoryMarkTool(deps),
  ];
}
