import type { AiricToolDefinition } from "../../../domain/tool/tool.js";
import { KERNEL_TOOL_NAMES } from "../../../domain/tool/tool-names.js";
import { textToolResult } from "../../../domain/tool/tool-result.js";
import {
  ProcessLifecycleError,
  startProcess,
} from "../../../application/services/process-lifecycle.js";
import type { ProcessToolDeps } from "./process-tool-deps.js";
import { loadSessionForProcessTool } from "./process-tool-deps.js";

const SCHEMA = {
  type: "object",
  properties: {
    processId: { type: "string", description: "Stable process identifier." },
    reason: {
      type: "string",
      description: "Why this process is being started.",
    },
    inputSummary: {
      type: "string",
      description: "Optional summary of process input context.",
    },
  },
  required: ["processId", "reason"],
};

export function createProcessStartTool(
  deps: ProcessToolDeps,
): AiricToolDefinition {
  return {
    name: KERNEL_TOOL_NAMES.PROCESS_START,
    kind: "other",
    description:
      "Start an Airic process workflow. Use when a process trigger matches and activation policy allows agent start.",
    inputSchema: SCHEMA,
    policy: "none",
    confirmation: "none",
    execute: async (input, context) => {
      const processId =
        typeof input.processId === "string" ? input.processId : "";
      const reason = typeof input.reason === "string" ? input.reason : "";
      const inputSummary =
        typeof input.inputSummary === "string" ? input.inputSummary : undefined;

      if (!processId || !reason) {
        throw new Error("processId and reason are required.");
      }

      try {
        const session = await loadSessionForProcessTool(deps, context.sessionId);
        const { instance, spec } = startProcess(session, deps.specRegistry, {
          processId,
          startedBy: "agent",
          reason,
          inputSummary,
        });
        await deps.sessionStore.save(session);

        const title =
          typeof spec.frontmatter.title === "string"
            ? spec.frontmatter.title
            : processId;

        const output = {
          processInstanceId: instance.id,
          processId: instance.processId,
          title,
          status: "active" as const,
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
