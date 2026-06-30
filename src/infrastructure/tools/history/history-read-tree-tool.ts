import { parseAnchor } from "../../../domain/session/anchor.js";
import type { AiricToolDefinition } from "../../../domain/tool/tool.js";
import { KERNEL_TOOL_NAMES } from "../../../domain/tool/tool-names.js";
import { textToolResult } from "../../../domain/tool/tool-result.js";
import { formatReadTree } from "../../../application/services/history-lifecycle.js";
import type { HistoryToolDeps } from "./history-tool-deps.js";
import { loadSessionForHistoryTool } from "./history-tool-deps.js";

const SCHEMA = {
  type: "object",
  properties: {
    from: {
      description:
        "Optional anchor to start the outline from. Defaults to root.",
    },
    depth: {
      type: "number",
      description: "Maximum depth below `from` (default: unlimited).",
    },
  },
};

export function createHistoryReadTreeTool(deps: HistoryToolDeps): AiricToolDefinition {
  return {
    name: KERNEL_TOOL_NAMES.HISTORY_READ_TREE,
    kind: "read",
    description:
      "Read a compact outline of the session turn tree with handles, kinds, labels, and cursor-path markers.",
    inputSchema: SCHEMA,
    policy: "none",
    confirmation: "none",
    execute: async (input, context) => {
      const session = await loadSessionForHistoryTool(deps, context.sessionId);
      const from =
        input.from !== undefined ? parseAnchor(input.from) : undefined;
      const depth = typeof input.depth === "number" ? input.depth : undefined;

      const text = formatReadTree(session, {
        from: from ?? undefined,
        depth,
      });

      return textToolResult(text, { entries: text.split("\n").filter(Boolean) });
    },
  };
}
