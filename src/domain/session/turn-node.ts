import type { TranscriptMessage } from "../agent/transcript.js";

export type TurnKind = "normal";

export type TurnNode = {
  id: string;
  parentId?: string;

  userMessage: string;
  assistantMessage: string;

  title: string;
  summary?: string;

  /** Full turn slice incl. tool calls/results. Stored for replay/export; excluded from default model context via `projectCursorPath()`. */
  toolTrace?: TranscriptMessage[];

  kind: TurnKind;
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
