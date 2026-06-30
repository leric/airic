import type { Session } from "./session.js";
import type { SummaryMeta, TurnNode } from "./turn-node.js";

export class TreeInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TreeInvariantError";
  }
}

export function isAncestor(
  session: Session,
  ancestorId: string,
  descendantId: string,
): boolean {
  if (ancestorId === descendantId) {
    return true;
  }

  let currentId: string | undefined = descendantId;
  while (currentId) {
    const node: TurnNode | undefined = session.turns[currentId];
    if (!node) {
      return false;
    }
    if (node.parentId === ancestorId) {
      return true;
    }
    currentId = node.parentId;
  }

  return false;
}

export function validateSummaryMeta(session: Session, meta: SummaryMeta): void {
  if (!session.turns[meta.source.fromId]) {
    throw new TreeInvariantError(
      `Summary source.fromId not found: ${meta.source.fromId.slice(0, 8)}`,
    );
  }
  if (!session.turns[meta.source.toId]) {
    throw new TreeInvariantError(
      `Summary source.toId not found: ${meta.source.toId.slice(0, 8)}`,
    );
  }
  if (!isAncestor(session, meta.source.fromId, meta.source.toId)) {
    throw new TreeInvariantError(
      "Summary source.fromId must be an ancestor of source.toId",
    );
  }
}
