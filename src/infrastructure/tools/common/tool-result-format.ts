import type { AiricToolResult } from "../../../domain/tool/tool-result.js";
import {
  extractTextFromToolResult,
  findDiffContent,
} from "../../../domain/tool/tool-result.js";

export { findDiffContent };

export function formatToolResultText(result: AiricToolResult): string {
  return extractTextFromToolResult(result);
}
