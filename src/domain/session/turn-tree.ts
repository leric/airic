import { randomUUID } from "node:crypto";
import type { TranscriptMessage } from "../agent/transcript.js";
import type { Session } from "./session.js";
import { generateTurnTitle, type TurnKind, type TurnNode } from "./turn-node.js";

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

  return turn;
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
 *  Excludes sibling branches and per-turn `toolTrace`. */
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
