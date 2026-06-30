import { parseAnchor } from "../../../domain/session/anchor.js";
import type { AiricToolDefinition } from "../../../domain/tool/tool.js";
import { KERNEL_TOOL_NAMES } from "../../../domain/tool/tool-names.js";
import { textToolResult } from "../../../domain/tool/tool-result.js";
import {
  AnchorError,
  formatAnchorError,
  moveCursor,
} from "../../../application/services/history-lifecycle.js";
import type { HistoryToolDeps } from "./history-tool-deps.js";
import { loadSessionForHistoryTool } from "./history-tool-deps.js";

const SCHEMA = {
  type: "object",
  properties: {
    target: {
      description:
        "Anchor to move cursor to (cursor, root, parent, nearest-fork, {recent:N}, {olderThan:N}, {label}, nodeId).",
    },
  },
  required: ["target"],
};

export function createHistoryMoveCursorTool(
  deps: HistoryToolDeps,
): AiricToolDefinition {
  return {
    name: KERNEL_TOOL_NAMES.HISTORY_MOVE_CURSOR,
    kind: "other",
    description: "Move the session cursor to another node in the turn tree.",
    inputSchema: SCHEMA,
    policy: "none",
    confirmation: "none",
    execute: async (input, context) => {
      const target = parseAnchor(input.target);
      if (!target) {
        throw new Error("target is required and must be a valid anchor.");
      }

      const session = await loadSessionForHistoryTool(deps, context.sessionId);

      try {
        const node = moveCursor(session, target);
        session.updatedAt = new Date().toISOString();
        await deps.sessionStore.save(session);

        await deps.historyAuditLog.append({
          timestamp: new Date().toISOString(),
          sessionId: session.id,
          action: "move_cursor",
          initiatedBy: "agent",
          params: { target: input.target },
          resolvedNodes: [node.id],
        });

        const text = `Cursor moved to ${node.title} (${node.id.slice(0, 8)}).`;
        return textToolResult(text, { nodeId: node.id });
      } catch (error) {
        if (error instanceof AnchorError) {
          throw new Error(formatAnchorError(error));
        }
        throw error;
      }
    },
  };
}
