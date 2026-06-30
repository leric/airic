import { parseAnchor } from "../../../domain/session/anchor.js";
import type { AiricToolDefinition } from "../../../domain/tool/tool.js";
import { KERNEL_TOOL_NAMES } from "../../../domain/tool/tool-names.js";
import { textToolResult } from "../../../domain/tool/tool-result.js";
import {
  formatAnchorError,
  readNode,
} from "../../../application/services/history-lifecycle.js";
import { AnchorError } from "../../../application/services/anchor-resolver.js";
import type { HistoryToolDeps } from "./history-tool-deps.js";
import { loadSessionForHistoryTool } from "./history-tool-deps.js";

const SCHEMA = {
  type: "object",
  properties: {
    ref: {
      description:
        "Anchor for the node to read (cursor, root, parent, nearest-fork, {recent:N}, {olderThan:N}, {label}, or nodeId handle from read_tree).",
    },
  },
  required: ["ref"],
};

export function createHistoryReadNodeTool(deps: HistoryToolDeps): AiricToolDefinition {
  return {
    name: KERNEL_TOOL_NAMES.HISTORY_READ_NODE,
    kind: "read",
    description:
      "Read full content of a single turn-tree node, including tool traces excluded from projection.",
    inputSchema: SCHEMA,
    policy: "none",
    confirmation: "none",
    execute: async (input, context) => {
      const ref = parseAnchor(input.ref);
      if (!ref) {
        throw new Error("ref is required and must be a valid anchor.");
      }

      const session = await loadSessionForHistoryTool(deps, context.sessionId);

      try {
        const node = readNode(session, ref);
        const text = JSON.stringify(node, null, 2);
        return textToolResult(text, node);
      } catch (error) {
        if (error instanceof AnchorError) {
          throw new Error(formatAnchorError(error));
        }
        throw error;
      }
    },
  };
}
