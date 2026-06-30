import { parseAnchor } from "../../../domain/session/anchor.js";
import type { Anchor } from "../../../domain/session/anchor.js";
import type { AiricToolDefinition } from "../../../domain/tool/tool.js";
import { KERNEL_TOOL_NAMES } from "../../../domain/tool/tool-names.js";
import { textToolResult } from "../../../domain/tool/tool-result.js";
import {
  AnchorError,
  buildSummarizeProposal,
  formatAnchorError,
  HistoryLifecycleError,
} from "../../../application/services/history-lifecycle.js";
import type { HistoryToolDeps } from "./history-tool-deps.js";
import { loadSessionForHistoryTool } from "./history-tool-deps.js";

const SCHEMA = {
  type: "object",
  properties: {
    source: {
      type: "object",
      properties: {
        from: { description: "Start anchor of range to summarize." },
        to: { description: "End anchor of range to summarize." },
      },
    },
    prompt: {
      type: "string",
      description: "How to summarize this range (required).",
    },
    mountAt: {
      description: "Where to graft summary when source is off the cursor path.",
    },
    moveCursor: {
      type: "boolean",
      description: "Move cursor to the new summary node after apply.",
    },
    label: {
      type: "string",
      description: "Optional label for the summary node.",
    },
  },
  required: ["prompt"],
};

function parseSource(input: Record<string, unknown>): { from: Anchor; to: Anchor } | undefined {
  if (!input.source || typeof input.source !== "object") {
    return undefined;
  }
  const source = input.source as Record<string, unknown>;
  const from = parseAnchor(source.from);
  const to = parseAnchor(source.to);
  if (!from || !to) {
    throw new Error("source.from and source.to must be valid anchors.");
  }
  return { from, to };
}

export function createHistorySummarizeTool(
  deps: HistoryToolDeps,
): AiricToolDefinition {
  return {
    name: KERNEL_TOOL_NAMES.HISTORY_SUMMARIZE,
    kind: "other",
    description:
      "Distill a history range into a summary node (compress on-path or graft off-path).",
    inputSchema: SCHEMA,
    policy: "none",
    confirmation: "preview",
    execute: async (input, context, signal) => {
      const prompt = typeof input.prompt === "string" ? input.prompt : "";
      const session = await loadSessionForHistoryTool(deps, context.sessionId);

      try {
        const proposal = await buildSummarizeProposal(
          session,
          {
            source: parseSource(input),
            prompt,
            mountAt:
              input.mountAt !== undefined
                ? parseAnchor(input.mountAt) ?? undefined
                : undefined,
            moveCursor: input.moveCursor === true,
            label: typeof input.label === "string" ? input.label : undefined,
          },
          deps.summarizationPort,
          deps.getLlmConfig(),
          signal,
        );

        const pending = deps.historyChangeStore.create({
          sessionId: session.id,
          action: "summarize",
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
