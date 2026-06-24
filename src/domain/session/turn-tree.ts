import { randomUUID } from "node:crypto";
import type { TranscriptMessage } from "../agent/transcript.js";
import type { Session } from "./session.js";
import { generateTurnTitle, type DigFrame, type TurnKind, type TurnNode } from "./turn-node.js";

export type AppendTurnInput = {
  userMessage: string;
  assistantMessage: string;
  toolTrace?: TranscriptMessage[];
  kind?: TurnKind;
  title?: string;
  parentId?: string;
};

export function appendTurn(session: Session, input: AppendTurnInput): TurnNode {
  const parentId = input.parentId ?? session.currentTurnId;
  const id = randomUUID();
  const now = new Date().toISOString();

  const turn: TurnNode = {
    id,
    parentId,
    userMessage: input.userMessage,
    assistantMessage: input.assistantMessage,
    title: input.title ?? generateTurnTitle(input.userMessage),
    toolTrace: input.toolTrace,
    kind: input.kind ?? "normal",
    createdAt: now,
  };

  session.turns[id] = turn;

  if (!session.rootTurnId) {
    session.rootTurnId = id;
  }

  session.currentTurnId = id;

  const activeFrame = session.digStack[session.digStack.length - 1];
  if (activeFrame) {
    if (!activeFrame.startTurnId) {
      activeFrame.startTurnId = id;
    }
    activeFrame.currentDigTurnId = id;
  }

  return turn;
}

export function beginDig(session: Session, topic?: string): DigFrame | null {
  if (!session.currentTurnId) {
    return null;
  }

  const frame: DigFrame = {
    baseTurnId: session.currentTurnId,
    topic,
    startedAt: new Date().toISOString(),
  };

  session.digStack.push(frame);
  return frame;
}

export function popDigFrame(session: Session): DigFrame | undefined {
  return session.digStack.pop();
}

export function activeDigFrame(session: Session): DigFrame | undefined {
  return session.digStack[session.digStack.length - 1];
}

export function cursorPath(session: Session): TurnNode[] {
  if (!session.currentTurnId) {
    return [];
  }

  const path: TurnNode[] = [];
  let currentId: string | undefined = session.currentTurnId;

  while (currentId) {
    const node: TurnNode | undefined = session.turns[currentId];
    if (!node) {
      break;
    }
    path.unshift(node);
    currentId = node.parentId;
  }

  return path;
}

/** Active cursor path as user/assistant text pairs for model context.
 *  Excludes sibling branches, digression branches after `/sumup`, and per-turn `toolTrace`. */
export function projectCursorPath(session: Session): TranscriptMessage[] {
  const now = new Date().toISOString();
  const messages: TranscriptMessage[] = [];

  for (const turn of cursorPath(session)) {
    messages.push({
      role: "user",
      content: turn.userMessage,
      timestamp: turn.createdAt ?? now,
    });
    messages.push({
      role: "assistant",
      content: turn.assistantMessage,
      timestamp: turn.createdAt ?? now,
    });
  }

  return messages;
}

export function digressionPath(session: Session, frame: DigFrame): TurnNode[] {
  if (!frame.startTurnId) {
    return [];
  }

  const endId = frame.currentDigTurnId ?? frame.startTurnId;
  const path: TurnNode[] = [];
  let currentId: string | undefined = endId;

  while (currentId) {
    const node: TurnNode | undefined = session.turns[currentId];
    if (!node) {
      break;
    }
    path.unshift(node);
    if (currentId === frame.startTurnId) {
      break;
    }
    currentId = node.parentId;
  }

  return path;
}

export function projectDigressionPath(
  session: Session,
  frame: DigFrame,
): TranscriptMessage[] {
  const now = new Date().toISOString();
  const messages: TranscriptMessage[] = [];

  for (const turn of digressionPath(session, frame)) {
    messages.push({
      role: "user",
      content: turn.userMessage,
      timestamp: turn.createdAt ?? now,
    });
    messages.push({
      role: "assistant",
      content: turn.assistantMessage,
      timestamp: turn.createdAt ?? now,
    });
  }

  return messages;
}

export function createReturnSummaryTurn(
  session: Session,
  frame: DigFrame,
  summaryText: string,
): TurnNode {
  const baseTurn = session.turns[frame.baseTurnId];
  const resumeTitle = baseTurn?.title ?? "previous discussion";

  return appendTurn(session, {
    parentId: frame.baseTurnId,
    userMessage: "/sumup",
    assistantMessage: summaryText,
    kind: "returnSummary",
    title: `Return summary: ${resumeTitle}`,
  });
}

export function renderTree(session: Session): string {
  if (!session.rootTurnId) {
    return "(empty session tree)";
  }

  const lines: string[] = [];
  renderSubtree(session, session.rootTurnId, "", true, lines);
  return lines.join("\n");
}

function renderSubtree(
  session: Session,
  turnId: string,
  prefix: string,
  isLast: boolean,
  lines: string[],
): void {
  const node = session.turns[turnId];
  if (!node) {
    return;
  }

  const connector = isLast ? "└─" : "├─";
  const marker = turnId === session.currentTurnId ? " ← current" : "";
  lines.push(`${prefix}${connector} ${turnId.slice(0, 8)}  ${node.title}${marker}`);

  const children = findChildTurnIds(session, turnId);
  const childPrefix = prefix + (isLast ? "   " : "│  ");

  children.forEach((childId, index) => {
    renderSubtree(session, childId, childPrefix, index === children.length - 1, lines);
  });
}

function findChildTurnIds(session: Session, parentId: string): string[] {
  return Object.values(session.turns)
    .filter((turn) => turn.parentId === parentId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((turn) => turn.id);
}
