import type { SummaryMeta } from "../session/turn-node.js";

export type HistoryChangeAction = "summarize" | "mark";

export type SummarizeApplyPayload = {
  action: "summarize";
  parentId: string;
  summaryMeta: SummaryMeta;
  labels?: string[];
  moveCursor?: boolean;
};

export type MarkApplyPayload = {
  action: "mark";
  nodeId: string;
  label: string;
};

export type HistoryApplyPayload = SummarizeApplyPayload | MarkApplyPayload;

export type PendingHistoryChange = {
  id: string;
  sessionId: string;
  action: HistoryChangeAction;
  previewText: string;
  applyPayload: HistoryApplyPayload;
  createdAt: string;
};

export type HistoryAuditEntry = {
  timestamp: string;
  sessionId: string;
  action: HistoryChangeAction | "move_cursor";
  initiatedBy: "user" | "agent";
  params: Record<string, unknown>;
  resolvedNodes: string[];
};
