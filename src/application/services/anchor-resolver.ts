import type { Anchor } from "../../domain/session/anchor.js";
import type { Session } from "../../domain/session/session.js";
import type { TurnNode } from "../../domain/session/turn-node.js";
import {
  cursorPath,
  findChildTurnIds,
  isOnCursorPath,
} from "../../domain/session/turn-tree.js";

export class AnchorError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "AnchorError";
  }
}

export type ResolveAnchorResult =
  | { ok: true; node: TurnNode }
  | { ok: false; error: AnchorError };

/** Resolve an anchor to a concrete turn node.
 *  `recent` / `olderThan` count user turns (one turn node = one round). */
export function resolveAnchor(session: Session, anchor: Anchor): ResolveAnchorResult {
  try {
    const node = resolveAnchorOrThrow(session, anchor);
    return { ok: true, node };
  } catch (error) {
    if (error instanceof AnchorError) {
      return { ok: false, error };
    }
    throw error;
  }
}

export function resolveAnchorOrThrow(session: Session, anchor: Anchor): TurnNode {
  const path = cursorPath(session);

  switch (anchor) {
    case "cursor": {
      if (!session.currentTurnId) {
        throw new AnchorError("No cursor set on session", "NO_CURSOR");
      }
      return requireNode(session, session.currentTurnId);
    }
    case "root": {
      if (!session.rootTurnId) {
        throw new AnchorError("Session tree is empty", "EMPTY_TREE");
      }
      return requireNode(session, session.rootTurnId);
    }
    case "parent": {
      if (path.length < 2) {
        throw new AnchorError("Cursor has no parent", "NO_PARENT");
      }
      return path[path.length - 2]!;
    }
    case "nearest-fork": {
      return resolveNearestFork(session, path);
    }
    default:
      break;
  }

  if ("recent" in anchor) {
    return resolveRecent(path, anchor.recent);
  }

  if ("olderThan" in anchor) {
    return resolveOlderThan(path, anchor.olderThan);
  }

  if ("label" in anchor) {
    return resolveLabel(session, anchor.label);
  }

  if ("nodeId" in anchor) {
    return resolveNodeId(session, anchor.nodeId);
  }

  throw new AnchorError("Invalid anchor", "INVALID_ANCHOR");
}

function resolveRecent(path: TurnNode[], recent: number): TurnNode {
  if (!Number.isInteger(recent) || recent < 1) {
    throw new AnchorError("recent must be a positive integer", "INVALID_RECENT");
  }
  if (path.length < recent) {
    throw new AnchorError(
      `recent:${recent} exceeds cursor path length (${path.length})`,
      "RECENT_OUT_OF_RANGE",
    );
  }
  return path[path.length - recent]!;
}

function resolveOlderThan(path: TurnNode[], olderThan: number): TurnNode {
  if (!Number.isInteger(olderThan) || olderThan < 1) {
    throw new AnchorError(
      "olderThan must be a positive integer",
      "INVALID_OLDER_THAN",
    );
  }
  const index = path.length - olderThan - 1;
  if (index < 0) {
    throw new AnchorError(
      `olderThan:${olderThan} exceeds cursor path length (${path.length})`,
      "OLDER_THAN_OUT_OF_RANGE",
    );
  }
  return path[index]!;
}

function resolveLabel(session: Session, label: string): TurnNode {
  const matches = Object.values(session.turns).filter((node) =>
    node.labels?.includes(label),
  );

  if (matches.length === 0) {
    throw new AnchorError(`No node with label "${label}"`, "LABEL_NOT_FOUND");
  }
  if (matches.length > 1) {
    throw new AnchorError(
      `Label "${label}" is ambiguous (${matches.length} nodes)`,
      "LABEL_AMBIGUOUS",
    );
  }
  return matches[0]!;
}

function resolveNodeId(session: Session, nodeId: string): TurnNode {
  if (session.turns[nodeId]) {
    return session.turns[nodeId]!;
  }

  const matches = Object.keys(session.turns).filter((id) => id.startsWith(nodeId));
  if (matches.length === 1) {
    return session.turns[matches[0]!]!;
  }
  if (matches.length > 1) {
    throw new AnchorError(
      `Node id prefix "${nodeId}" is ambiguous`,
      "NODE_ID_AMBIGUOUS",
    );
  }

  throw new AnchorError(`Node not found: ${nodeId}`, "NODE_NOT_FOUND");
}

function resolveNearestFork(session: Session, path: TurnNode[]): TurnNode {
  for (let i = path.length - 1; i >= 0; i -= 1) {
    const node = path[i]!;
    const childCount = findChildTurnIds(session, node.id).length;
    if (childCount > 1) {
      return node;
    }
  }

  if (!session.rootTurnId) {
    throw new AnchorError("Session tree is empty", "EMPTY_TREE");
  }
  return requireNode(session, session.rootTurnId);
}

function requireNode(session: Session, nodeId: string): TurnNode {
  const node = session.turns[nodeId];
  if (!node) {
    throw new AnchorError(`Node not found: ${nodeId.slice(0, 8)}`, "NODE_NOT_FOUND");
  }
  return node;
}

export function formatAnchorError(error: AnchorError): string {
  return `${error.code}: ${error.message}`;
}

export function isNodeOnCursorPath(session: Session, nodeId: string): boolean {
  return isOnCursorPath(session, nodeId);
}
