import type { TranscriptMessage } from "../agent/transcript.js";

export type EntryKind = "message" | "summary" | "extension";

/** @deprecated Use EntryKind. Kept for JSON migration from legacy sessions. */
export type TurnKind = EntryKind | "normal";

export type SummaryMeta = {
  source: { fromId: string; toId: string };
  replacesRange: boolean;
  prompt: string;
  producedText: string;
};

export type TurnNode = {
  id: string;
  parentId?: string;

  /** message nodes */
  userMessage?: string;
  assistantMessage?: string;
  toolTrace?: TranscriptMessage[];

  title: string;
  /** Legacy one-line summary on message nodes; distinct from summary entry kind. */
  summary?: string;

  labels?: string[];

  /** summary nodes */
  summaryMeta?: SummaryMeta;

  /** extension nodes — pack-defined opaque payload */
  extensionPayload?: Record<string, unknown>;

  kind: EntryKind;
  createdAt: string;
};

const MAX_TITLE_LENGTH = 80;

export function generateTurnTitle(userMessage: string): string {
  const firstLine = userMessage.split("\n").find((line) => line.trim().length > 0);
  if (!firstLine) {
    return "Untitled turn";
  }

  const trimmed = firstLine.trim();
  if (trimmed.length <= MAX_TITLE_LENGTH) {
    return trimmed;
  }

  return `${trimmed.slice(0, MAX_TITLE_LENGTH - 1)}…`;
}

export function normalizeEntryKind(kind: TurnKind | undefined): EntryKind {
  if (kind === "summary" || kind === "extension") {
    return kind;
  }
  return "message";
}

export function isMessageNode(node: TurnNode): boolean {
  return node.kind === "message";
}

export function isSummaryNode(node: TurnNode): boolean {
  return node.kind === "summary";
}
