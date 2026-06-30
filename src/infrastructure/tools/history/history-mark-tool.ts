import type { AiricToolDefinition } from "../../../domain/tool/tool.js";
import { KERNEL_TOOL_NAMES } from "../../../domain/tool/tool-names.js";
import { textToolResult } from "../../../domain/tool/tool-result.js";
import {
  AnchorError,
  buildMarkProposal,
  formatAnchorError,
  HistoryLifecycleError,
} from "../../../application/services/history-lifecycle.js";
import { parseAnchor } from "../../../domain/session/anchor.js";
import type { HistoryToolDeps } from "./history-tool-deps.js";
import { loadSessionForHistoryTool } from "./history-tool-deps.js";

const SCHEMA = {
  type: "object",
  properties: {
    at: {
      description: "Anchor of node to mark (default: cursor).",
    },
    name: {
      type: "string",
      description: "Label name for future anchor references.",
    },
  },
  required: ["name"],
};

export function createHistoryMarkTool(deps: HistoryToolDeps): AiricToolDefinition {
  return {
    name: KERNEL_TOOL_NAMES.HISTORY_MARK,
    kind: "other",
    description: "Add a named label anchor to a turn-tree node.",
    inputSchema: SCHEMA,
    policy: "none",
    confirmation: "preview",
    execute: async (input, context) => {
      const name = typeof input.name === "string" ? input.name : "";
      const session = await loadSessionForHistoryTool(deps, context.sessionId);

      try {
        const proposal = buildMarkProposal(session, {
          at: input.at !== undefined ? parseAnchor(input.at) ?? undefined : undefined,
          name,
        });

        const pending = deps.historyChangeStore.create({
          sessionId: session.id,
          action: "mark",
          previewText: proposal.previewText,
          applyPayload: proposal.applyPayload,
        });

        return textToolResult(proposal.previewText, {
          pendingHistoryChangeId: pending.id,
          preview: true,
        });
      } catch (error) {
        if (error instanceof AnchorError) {
          throw new Error(formatAnchorError(error));
        }
        if (error instanceof HistoryLifecycleError) {
          throw error;
        }
        throw error;
      }
    },
  };
}
