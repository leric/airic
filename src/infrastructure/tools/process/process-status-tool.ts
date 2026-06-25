import type { AiricToolDefinition } from "../../../domain/tool/tool.js";
import { KERNEL_TOOL_NAMES } from "../../../domain/tool/tool-names.js";
import { textToolResult } from "../../../domain/tool/tool-result.js";
import { getProcessStatus } from "../../../application/services/process-lifecycle.js";
import type { ProcessToolDeps } from "./process-tool-deps.js";
import { loadSessionForProcessTool } from "./process-tool-deps.js";

const SCHEMA = {
  type: "object",
  properties: {},
};

export function createProcessStatusTool(
  deps: ProcessToolDeps,
): AiricToolDefinition {
  return {
    name: KERNEL_TOOL_NAMES.PROCESS_STATUS,
    kind: "other",
    description: "Get the active Airic process status for this session.",
    inputSchema: SCHEMA,
    policy: "none",
    confirmation: "none",
    execute: async (_input, context) => {
      const session = await loadSessionForProcessTool(deps, context.sessionId);
      const status = getProcessStatus(session, deps.specRegistry);
      return textToolResult(JSON.stringify(status, null, 2), status);
    },
  };
}
