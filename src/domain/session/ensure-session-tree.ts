import type { Session } from "./session.js";
import { findTimelineLeafId } from "./turn-tree.js";
import { normalizeEntryKind, type TurnNode } from "./turn-node.js";

/** Defaults missing turn-tree fields on an in-memory session.
 *  Persistence-side sibling: `JsonSessionStore.get()` applies the same defaults on load. */
export function ensureSessionTree(session: Session): void {
  if (!session.turns) {
    session.turns = {};
  }
  if (!session.processInstances) {
    session.processInstances = {};
  }

  migrateTurnNodes(session);

  if (!session.currentTurnId) {
    session.currentTurnId = findTimelineLeafId(session);
  }
}

function migrateTurnNodes(session: Session): void {
  for (const node of Object.values(session.turns)) {
    migrateTurnNode(node);
  }
}

function migrateTurnNode(node: TurnNode): void {
  node.kind = normalizeEntryKind(node.kind as "normal" | undefined);
  if (!node.labels) {
    node.labels = [];
  }
}
