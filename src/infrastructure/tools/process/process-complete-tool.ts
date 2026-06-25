import type { AiricToolDefinition } from "../../../domain/tool/tool.js";
import { KERNEL_TOOL_NAMES } from "../../../domain/tool/tool-names.js";
import { textToolResult } from "../../../domain/tool/tool-result.js";
import {
  ProcessLifecycleError,
  completeProcess,
} from "../../../application/services/process-lifecycle.js";
import type { ProcessToolDeps } from "./process-tool-deps.js";
import { loadSessionForProcessTool } from "./process-tool-deps.js";

const SCHEMA = {
  type: "object",
  properties: {
    processInstanceId: {
      type: "string",
      description: "Optional process instance ID. Defaults to active process.",
    },
    outputSummary: {
      type: "string",
      description: "Summary of what the process produced.",
    },
  },
  required: ["outputSummary"],
};

export function createProcessCompleteTool(
  deps: ProcessToolDeps,
): AiricToolDefinition {
  return {
    name: KERNEL_TOOL_NAMES.PROCESS_COMPLETE,
    kind: "other",
    description: "Complete the active Airic process workflow.",
    inputSchema: SCHEMA,
    policy: "none",
    confirmation: "none",
    execute: async (input, context) => {
      const outputSummary =
        typeof input.outputSummary === "string" ? input.outputSummary : "";
      const processInstanceId =
        typeof input.processInstanceId === "string"
          ? input.processInstanceId
          : undefined;

      if (!outputSummary) {
        throw new Error("outputSummary is required.");
      }

      try {
        const session = await loadSessionForProcessTool(deps, context.sessionId);
        const instance = completeProcess(session, deps.specRegistry, {
          processInstanceId,
          outputSummary,
        });
        await deps.sessionStore.save(session);

        const output = {
          processInstanceId: instance.id,
          processId: instance.processId,
          status: instance.status,
        };

        return textToolResult(JSON.stringify(output, null, 2), output);
      } catch (error) {
        if (error instanceof ProcessLifecycleError) {
          throw error;
        }
        throw error;
      }
    },
  };
}
