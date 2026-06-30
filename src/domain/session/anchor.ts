/** Anchor references for history tree navigation.
 *  One "round" = one turn node (user message + assistant/tool slice). */
export type Anchor =
  | "cursor"
  | "root"
  | "parent"
  | "nearest-fork"
  | { recent: number }
  | { olderThan: number }
  | { label: string }
  | { nodeId: string };

export function parseAnchor(value: unknown): Anchor | undefined {
  if (typeof value === "string") {
    if (
      value === "cursor" ||
      value === "root" ||
      value === "parent" ||
      value === "nearest-fork"
    ) {
      return value;
    }
    if (value.startsWith("label:")) {
      return { label: value.slice("label:".length) };
    }
    return { nodeId: value };
  }

  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.recent === "number") {
      return { recent: obj.recent };
    }
    if (typeof obj.olderThan === "number") {
      return { olderThan: obj.olderThan };
    }
    if (typeof obj.label === "string") {
      return { label: obj.label };
    }
    if (typeof obj.nodeId === "string") {
      return { nodeId: obj.nodeId };
    }
  }

  return undefined;
}

/** Parse slash-command anchor text: `parent`, `label:foo`, or node id prefix. */
export function parseAnchorText(text: string): Anchor | undefined {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  return parseAnchor(trimmed);
}
