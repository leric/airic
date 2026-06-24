import type { AiricToolResult } from "../../../domain/tool/tool-result.js";

export function formatToolResultText(result: AiricToolResult): string {
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
