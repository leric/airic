export type AiricToolContent =
  | { type: "text"; text: string }
  | { type: "diff"; path: string; oldText: string | null; newText: string }
  | { type: "terminal"; terminalId: string };

export type AiricToolResult = {
  content: AiricToolContent[];
  details?: Record<string, unknown>;
};

export function textToolResult(text: string, details?: Record<string, unknown>): AiricToolResult {
  return {
    content: [{ type: "text", text }],
    details,
  };
}

export function extractTextFromToolResult(result: AiricToolResult): string {
  return result.content
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export function findDiffContent(result: AiricToolResult) {
  return result.content.find(
    (part): part is Extract<AiricToolResult["content"][number], { type: "diff" }> =>
      part.type === "diff",
  );
}
