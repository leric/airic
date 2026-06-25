import type { AiricToolDefinition } from "../../../domain/tool/tool.js";
import { KERNEL_TOOL_NAMES } from "../../../domain/tool/tool-names.js";
import { textToolResult } from "../../../domain/tool/tool-result.js";
import {
  buildProcessIndexText,
  listProcesses,
} from "../../../application/services/process-catalog.js";
import type { ProcessToolDeps } from "./process-tool-deps.js";

const SCHEMA = {
  type: "object",
  properties: {},
};

export function createProcessListTool(
  deps: ProcessToolDeps,
): AiricToolDefinition {
  return {
    name: KERNEL_TOOL_NAMES.PROCESS_LIST,
    kind: "other",
    description: "List available Airic process workflows.",
    inputSchema: SCHEMA,
    policy: "none",
    confirmation: "none",
    execute: async () => {
      const processes = listProcesses(deps.specRegistry);
      const output = {
        processes,
        indexText: buildProcessIndexText(processes),
      };
      return textToolResult(JSON.stringify(output, null, 2), output);
    },
  };
}
