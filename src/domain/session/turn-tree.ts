import { randomUUID } from "node:crypto";
import type { TranscriptMessage } from "../agent/transcript.js";
import type { Session } from "./session.js";
import {
  appendCompactToolTrace,
  compactToolTraceForProjection,
  type CompactToolTraceOptions,
} from "./compact-tool-trace.js";
import { validateSummaryMeta } from "./tree-invariants.js";
import {
  generateTurnTitle,
  type EntryKind,
  type SummaryMeta,
  type TurnNode,
} from "./turn-node.js";

export type AppendTurnInput = {
  userMessage: string;
  assistantMessage: string;
  toolTrace?: TranscriptMessage[];
  kind?: EntryKind;
  title?: string;
  parentId?: string;
};

export type AppendSummaryInput = {
  parentId: string;
  summaryMeta: SummaryMeta;
  title?: string;
  labels?: string[];
  moveCursor?: boolean;
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
    kind: input.kind ?? "message",
    labels: [],
    createdAt: now,
  };

  session.turns[id] = turn;

  if (!session.rootTurnId) {
    session.rootTurnId = id;
  }

  session.currentTurnId = id;

  return turn;
}

export function appendSummaryNode(
  session: Session,
  input: AppendSummaryInput,
): TurnNode {
  validateSummaryMeta(session, input.summaryMeta);

  const id = randomUUID();
  const now = new Date().toISOString();
  const title =
    input.title ??
    `Summary: ${input.summaryMeta.producedText.slice(0, 60).trim()}…`;

  const node: TurnNode = {
    id,
    parentId: input.parentId,
    title,
    kind: "summary",
    summaryMeta: input.summaryMeta,
    labels: input.labels ?? [],
    userMessage: "",
    assistantMessage: input.summaryMeta.producedText,
    createdAt: now,
  };

  session.turns[id] = node;

  if (input.moveCursor) {
    session.currentTurnId = id;
  }

  return node;
}

export function addLabel(session: Session, nodeId: string, name: string): TurnNode {
  const node = session.turns[nodeId];
  if (!node) {
    throw new Error(`Node not found: ${nodeId.slice(0, 8)}`);
  }

  const labels = node.labels ?? [];
  if (!labels.includes(name)) {
    node.labels = [...labels, name];
  }

  return node;
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

export { isAncestor } from "./tree-invariants.js";

export function isOnCursorPath(session: Session, nodeId: string): boolean {
  return cursorPath(session).some((node) => node.id === nodeId);
}

export function findChildTurnIds(session: Session, parentId: string): string[] {
  return Object.values(session.turns)
    .filter((turn) => turn.parentId === parentId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((turn) => turn.id);
}

export function findReplacingSummariesOnPath(
  session: Session,
  path: TurnNode[],
): TurnNode[] {
  const pathIds = new Set(path.map((node) => node.id));
  return Object.values(session.turns).filter((node) => {
    if (node.kind !== "summary" || !node.summaryMeta?.replacesRange) {
      return false;
    }
    const { fromId, toId } = node.summaryMeta.source;
    if (!pathIds.has(fromId) || !pathIds.has(toId)) {
      return false;
    }
    const fromIndex = path.findIndex((n) => n.id === fromId);
    const toIndex = path.findIndex((n) => n.id === toId);
    return fromIndex >= 0 && toIndex >= fromIndex;
  });
}

export function activeReplacingSummaryStartingAt(
  session: Session,
  startNode: TurnNode,
  path: TurnNode[],
): TurnNode | undefined {
  const startIndex = path.findIndex((node) => node.id === startNode.id);
  if (startIndex < 0) {
    return undefined;
  }

  const candidates = findReplacingSummariesOnPath(session, path).filter(
    (node) => node.summaryMeta!.source.fromId === startNode.id,
  );

  if (candidates.length === 0) {
    return undefined;
  }

  // Prefer the summary whose range ends latest on the path (outer replacement first).
  candidates.sort((a, b) => {
    const aTo = path.findIndex((n) => n.id === a.summaryMeta!.source.toId);
    const bTo = path.findIndex((n) => n.id === b.summaryMeta!.source.toId);
    return bTo - aTo;
  });

  return candidates[0];
}

export function renderNodeForProjection(
  node: TurnNode,
  options?: CompactToolTraceOptions,
): TranscriptMessage[] {
  const timestamp = node.createdAt;

  if (node.kind === "summary" && node.summaryMeta) {
    return [
      {
        role: "assistant",
        content: node.summaryMeta.producedText,
        timestamp,
      },
    ];
  }

  if (node.kind === "extension") {
    return [];
  }

  if (node.toolTrace && node.toolTrace.length > 0) {
    return compactToolTraceForProjection(node.toolTrace, options);
  }

  const messages: TranscriptMessage[] = [];
  if (node.userMessage !== undefined && node.userMessage.length > 0) {
    messages.push({
      role: "user",
      content: node.userMessage,
      timestamp,
    });
  }
  if (node.assistantMessage !== undefined && node.assistantMessage.length > 0) {
    messages.push({
      role: "assistant",
      content: node.assistantMessage,
      timestamp,
    });
  }
  return messages;
}

/** Active cursor path for model context with summary range replacement.
 *  Excludes sibling branches. Prior-turn tool traces are projected in compact form. */
export function projectCursorPath(
  session: Session,
  options?: CompactToolTraceOptions,
): TranscriptMessage[] {
  const path = cursorPath(session);
  const messages: TranscriptMessage[] = [];

  let i = 0;
  while (i < path.length) {
    const node = path[i]!;
    const replacing = activeReplacingSummaryStartingAt(session, node, path);

    if (replacing?.summaryMeta) {
      const fromIndex = path.findIndex(
        (n) => n.id === replacing.summaryMeta!.source.fromId,
      );
      const toIndex = path.findIndex(
        (n) => n.id === replacing.summaryMeta!.source.toId,
      );

      for (const skippedNode of path.slice(fromIndex, toIndex + 1)) {
        if (skippedNode.toolTrace && skippedNode.toolTrace.length > 0) {
          appendCompactToolTrace(messages, skippedNode.toolTrace, {
            ...options,
            skipLeadingUser: true,
          });
        }
      }

      messages.push({
        role: "assistant",
        content: replacing.summaryMeta.producedText,
        timestamp: replacing.createdAt,
      });
      i = toIndex + 1;
    } else {
      messages.push(...renderNodeForProjection(node, options));
      i += 1;
    }
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
  const kindTag = node.kind !== "message" ? ` [${node.kind}]` : "";
  const labelTag =
    node.labels && node.labels.length > 0 ? ` @{${node.labels.join(",")}}` : "";
  lines.push(
    `${prefix}${connector} ${turnId.slice(0, 8)}  ${node.title}${kindTag}${labelTag}${marker}`,
  );

  const children = findChildTurnIds(session, turnId);
  const childPrefix = prefix + (isLast ? "   " : "│  ");

  children.forEach((childId, index) => {
    renderSubtree(session, childId, childPrefix, index === children.length - 1, lines);
  });
}

/** Walk from root along the last-created child chain to the leaf. */
export function findTimelineLeafId(session: Session): string | undefined {
  if (!session.rootTurnId) {
    return undefined;
  }

  let currentId = session.rootTurnId;
  while (true) {
    const children = findChildTurnIds(session, currentId);
    if (children.length === 0) {
      return currentId;
    }
    currentId = children[children.length - 1]!;
  }
}
