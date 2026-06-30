import type { Anchor } from "../../domain/session/anchor.js";
import type { Session } from "../../domain/session/session.js";
import type { TurnNode } from "../../domain/session/turn-node.js";
import type { SummaryMeta } from "../../domain/session/turn-node.js";
import type { AiricConfig } from "../ports/config-loader-port.js";
import type { SummarizationPort } from "../ports/summarization-port.js";
import type {
  HistoryApplyPayload,
  MarkApplyPayload,
  SummarizeApplyPayload,
} from "../../domain/tool/pending-history-change.js";
import {
  AnchorError,
  formatAnchorError,
  isNodeOnCursorPath,
  resolveAnchor,
  resolveAnchorOrThrow,
} from "./anchor-resolver.js";
import {
  addLabel,
  appendSummaryNode,
  cursorPath,
  findChildTurnIds,
  renderNodeForProjection,
} from "../../domain/session/turn-tree.js";

export { AnchorError, formatAnchorError };

export class HistoryLifecycleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HistoryLifecycleError";
  }
}

export type SummarizeInput = {
  source?: { from: Anchor; to: Anchor };
  prompt: string;
  mountAt?: Anchor;
  moveCursor?: boolean;
  label?: string;
};

export type MarkInput = {
  at?: Anchor;
  name: string;
};

export type SummarizeProposal = {
  previewText: string;
  applyPayload: SummarizeApplyPayload;
  resolvedNodeIds: string[];
};

export type MarkProposal = {
  previewText: string;
  applyPayload: MarkApplyPayload;
  resolvedNodeIds: string[];
};

export type TreeOutlineEntry = {
  shortHandle: string;
  nodeId: string;
  kind: TurnNode["kind"];
  oneLineSummary: string;
  labels: string[];
  isOnCursorPath: boolean;
};

export type ReadTreeOptions = {
  from?: Anchor;
  depth?: number;
};

function oneLineSummary(node: TurnNode): string {
  if (node.kind === "summary" && node.summaryMeta) {
    return node.summaryMeta.producedText.slice(0, 120);
  }
  if (node.userMessage && node.userMessage.trim().length > 0) {
    return node.userMessage.split("\n")[0]!.slice(0, 120);
  }
  return node.title;
}

export function readTree(
  session: Session,
  options: ReadTreeOptions = {},
): TreeOutlineEntry[] {
  const startNode = options.from
    ? resolveAnchorOrThrow(session, options.from)
    : session.rootTurnId
      ? session.turns[session.rootTurnId]
      : undefined;

  if (!startNode) {
    return [];
  }

  const depth = options.depth ?? Number.POSITIVE_INFINITY;
  const entries: TreeOutlineEntry[] = [];
  let handleCounter = 0;

  const walk = (nodeId: string, currentDepth: number): void => {
    const node = session.turns[nodeId];
    if (!node) {
      return;
    }

    handleCounter += 1;
    entries.push({
      shortHandle: `${nodeId.slice(0, 8)}#${handleCounter}`,
      nodeId: node.id,
      kind: node.kind,
      oneLineSummary: oneLineSummary(node),
      labels: node.labels ?? [],
      isOnCursorPath: isNodeOnCursorPath(session, node.id),
    });

    if (currentDepth >= depth) {
      return;
    }

    for (const childId of findChildTurnIds(session, nodeId)) {
      walk(childId, currentDepth + 1);
    }
  };

  walk(startNode.id, 0);
  return entries;
}

export function formatReadTree(session: Session, options: ReadTreeOptions = {}): string {
  const entries = readTree(session, options);
  if (entries.length === 0) {
    return "(empty session tree)";
  }

  return entries
    .map((entry) => {
      const pathMark = entry.isOnCursorPath ? " *" : "";
      const labels =
        entry.labels.length > 0 ? ` labels=[${entry.labels.join(", ")}]` : "";
      return `${entry.shortHandle} ${entry.kind} "${entry.oneLineSummary}"${labels}${pathMark}`;
    })
    .join("\n");
}

export function tryResolveAnchor(session: Session, anchor: Anchor) {
  return resolveAnchor(session, anchor);
}

export function pathBetween(
  session: Session,
  fromId: string,
  toId: string,
): TurnNode[] {
  const path = cursorPath(session);
  const fromIndex = path.findIndex((n) => n.id === fromId);
  const toIndex = path.findIndex((n) => n.id === toId);

  if (fromIndex < 0 || toIndex < 0 || fromIndex > toIndex) {
    return [];
  }

  return path.slice(fromIndex, toIndex + 1);
}

export function isRangeOnCursorPath(
  session: Session,
  fromId: string,
  toId: string,
): boolean {
  return pathBetween(session, fromId, toId).length > 0;
}

export function renderSourceRangeText(nodes: TurnNode[]): string {
  const parts: string[] = [];
  for (const node of nodes) {
    if (node.userMessage) {
      parts.push(`User: ${node.userMessage}`);
    }
    if (node.assistantMessage) {
      parts.push(`Assistant: ${node.assistantMessage}`);
    }
    if (node.toolTrace && node.toolTrace.length > 0) {
      for (const msg of node.toolTrace) {
        parts.push(`${msg.role}: ${msg.content}`);
      }
    }
  }
  return parts.join("\n\n");
}

export function renderNodeFullText(node: TurnNode): string {
  const projection = renderNodeForProjection(node);
  const parts = projection.map((m) => `${m.role}: ${m.content}`);
  if (node.toolTrace && node.toolTrace.length > 0) {
    for (const msg of node.toolTrace) {
      parts.push(`[toolTrace] ${msg.role}: ${msg.content}`);
    }
  }
  return parts.join("\n\n");
}

export function moveCursor(session: Session, target: Anchor): TurnNode {
  const node = resolveAnchorOrThrow(session, target);
  session.currentTurnId = node.id;
  return node;
}

function resolveDefaultSummarizeSource(session: Session): {
  fromId: string;
  toId: string;
} {
  const path = cursorPath(session);
  if (path.length < 2) {
    throw new HistoryLifecycleError(
      "Cannot infer summarize source on a path shorter than 2 nodes.",
    );
  }

  const fork = resolveAnchorOrThrow(session, "nearest-fork");
  const forkIndex = path.findIndex((node) => node.id === fork.id);
  if (forkIndex < 0 || forkIndex >= path.length - 1) {
    throw new HistoryLifecycleError(
      "Cannot infer side-branch summarize source: cursor is at or before nearest fork.",
    );
  }

  return {
    fromId: path[forkIndex + 1]!.id,
    toId: path[path.length - 1]!.id,
  };
}

function resolveSummarizeEndpoints(
  session: Session,
  input: SummarizeInput,
): { fromId: string; toId: string; fromNode: TurnNode; toNode: TurnNode } {
  const endpoints = input.source
    ? {
        fromId: resolveAnchorOrThrow(session, input.source.from).id,
        toId: resolveAnchorOrThrow(session, input.source.to).id,
      }
    : resolveDefaultSummarizeSource(session);

  const fromNode = session.turns[endpoints.fromId];
  const toNode = session.turns[endpoints.toId];
  if (!fromNode || !toNode) {
    throw new HistoryLifecycleError("Summarize source endpoints not found.");
  }

  return { ...endpoints, fromNode, toNode };
}

function firstChildOnPathTowardCursor(
  session: Session,
  forkId: string,
): TurnNode | undefined {
  const path = cursorPath(session);
  const forkIndex = path.findIndex((node) => node.id === forkId);
  if (forkIndex < 0 || forkIndex >= path.length - 1) {
    return undefined;
  }
  return path[forkIndex + 1];
}

export async function buildSummarizeProposal(
  session: Session,
  input: SummarizeInput,
  summarization: SummarizationPort,
  llm: AiricConfig["llm"],
  signal?: AbortSignal,
): Promise<SummarizeProposal> {
  const prompt = input.prompt?.trim() ?? "";
  if (!prompt) {
    throw new HistoryLifecycleError("prompt is required for history.summarize.");
  }

  const { fromId, toId, fromNode, toNode } = resolveSummarizeEndpoints(
    session,
    input,
  );

  const isDefaultSource = !input.source;
  const onPath = isRangeOnCursorPath(session, fromId, toId);
  const rangeNodes = onPath
    ? pathBetween(session, fromId, toId)
    : collectOffPathRange(session, fromId, toId);

  if (rangeNodes.length === 0) {
    throw new HistoryLifecycleError(
      "Summarize source range is empty or invalid.",
    );
  }

  const sourceText = renderSourceRangeText(rangeNodes);
  const producedText = await summarization.summarize({
    sourceText,
    prompt,
    llm,
    signal,
  });

  let replacesRange: boolean;
  let parentId: string;

  if (isDefaultSource) {
    replacesRange = false;
    parentId = resolveAnchorOrThrow(session, input.mountAt ?? "nearest-fork").id;
  } else if (onPath) {
    replacesRange = true;
    parentId = toId;
  } else {
    replacesRange = false;
    parentId = resolveAnchorOrThrow(session, input.mountAt ?? "nearest-fork").id;
  }

  const summaryMeta: SummaryMeta = {
    source: { fromId, toId },
    replacesRange,
    prompt,
    producedText,
  };

  const previewLines = [
    `Action: summarize`,
    `Source: ${fromNode.title} → ${toNode.title}`,
    `Nodes: ${rangeNodes.length}`,
    `Replaces in projection: ${replacesRange ? "yes" : "no (graft)"}`,
    `Mount parent: ${session.turns[parentId]?.title ?? parentId.slice(0, 8)}`,
    `Move cursor after apply: ${input.moveCursor ? "yes" : "no"}`,
    "",
    "Produced summary:",
    producedText,
  ];

  return {
    previewText: previewLines.join("\n"),
    applyPayload: {
      action: "summarize",
      parentId,
      summaryMeta,
      labels: input.label ? [input.label] : undefined,
      moveCursor: input.moveCursor,
    },
    resolvedNodeIds: rangeNodes.map((node) => node.id),
  };
}

function collectOffPathRange(
  session: Session,
  fromId: string,
  toId: string,
): TurnNode[] {
  const nodes: TurnNode[] = [];
  let currentId: string | undefined = fromId;

  while (currentId) {
    const node = session.turns[currentId];
    if (!node) {
      break;
    }
    nodes.push(node);
    if (currentId === toId) {
      break;
    }
    const children = findChildTurnIds(session, currentId);
    if (children.length !== 1) {
      break;
    }
    currentId = children[0];
  }

  if (nodes.length === 0 || nodes[nodes.length - 1]?.id !== toId) {
    return [];
  }

  return nodes;
}

export function applyHistoryChange(
  session: Session,
  payload: HistoryApplyPayload,
): TurnNode {
  if (payload.action === "mark") {
    return addLabel(session, payload.nodeId, payload.label);
  }

  return appendSummaryNode(session, {
    parentId: payload.parentId,
    summaryMeta: payload.summaryMeta,
    labels: payload.labels,
    moveCursor: payload.moveCursor,
  });
}

export function buildMarkProposal(session: Session, input: MarkInput): MarkProposal {
  const name = input.name.trim();
  if (!name) {
    throw new HistoryLifecycleError("name is required for history.mark.");
  }

  const existing = Object.values(session.turns).filter((node) =>
    node.labels?.includes(name),
  );
  if (existing.length > 0) {
    throw new HistoryLifecycleError(
      `Label "${name}" is already used on another node.`,
    );
  }

  const node = resolveAnchorOrThrow(session, input.at ?? "cursor");
  const previewText = [
    `Action: mark`,
    `Node: ${node.title} (${node.id.slice(0, 8)})`,
    `Label: ${name}`,
  ].join("\n");

  return {
    previewText,
    applyPayload: {
      action: "mark",
      nodeId: node.id,
      label: name,
    },
    resolvedNodeIds: [node.id],
  };
}

export function mergeHistoryState(target: Session, source: Session): void {
  target.currentTurnId = source.currentTurnId;
  target.turns = source.turns;
  target.rootTurnId = source.rootTurnId;
}

export function describeNode(session: Session, nodeId: string): string {
  const node = session.turns[nodeId];
  if (!node) {
    return nodeId.slice(0, 8);
  }
  return `${node.title} (${nodeId.slice(0, 8)})`;
}

export { firstChildOnPathTowardCursor };
