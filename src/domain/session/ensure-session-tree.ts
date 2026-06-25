import type { Session } from "./session.js";

/** Defaults missing turn-tree fields on an in-memory session.
 *  Persistence-side sibling: `JsonSessionStore.get()` applies the same defaults on load. */
export function ensureSessionTree(session: Session): void {
  if (!session.turns) {
    session.turns = {};
  }
  if (!session.digStack) {
    session.digStack = [];
  }
  if (!session.processInstances) {
    session.processInstances = {};
  }
}
