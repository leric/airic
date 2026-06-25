import type { AiricToolDefinition } from "../../../domain/tool/tool.js";
import { KERNEL_TOOL_NAMES } from "../../../domain/tool/tool-names.js";
import { textToolResult } from "../../../domain/tool/tool-result.js";
import {
  ProcessLifecycleError,
  cancelProcess,
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
    reason: {
      type: "string",
      description: "Why the process is being cancelled.",
    },
  },
  required: ["reason"],
};

export function createProcessCancelTool(
  deps: ProcessToolDeps,
): AiricToolDefinition {
  return {
    name: KERNEL_TOOL_NAMES.PROCESS_CANCEL,
    kind: "other",
    description: "Cancel the active Airic process workflow.",
    inputSchema: SCHEMA,
    policy: "none",
    confirmation: "none",
    execute: async (input, context) => {
      const reason = typeof input.reason === "string" ? input.reason : "";
      const processInstanceId =
        typeof input.processInstanceId === "string"
          ? input.processInstanceId
          : undefined;

      if (!reason) {
        throw new Error("reason is required.");
      }

      try {
        const session = await loadSessionForProcessTool(deps, context.sessionId);
        const instance = cancelProcess(session, {
          processInstanceId,
          reason,
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
