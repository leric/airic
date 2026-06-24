import type { AiricToolResult } from "../../domain/tool/tool-result.js";
import type { AgentRuntimeEvent } from "../../application/ports/agent-runtime-port.js";
import { formatToolResultText } from "../../infrastructure/tools/common/tool-result-format.js";

export type AcpToolCallContent =
  | { type: "content"; content: { type: "text"; text: string } }
  | { type: "diff"; path: string; oldText: string | null; newText: string };

export function mapToolResultToAcpContent(
  result: AiricToolResult,
): AcpToolCallContent[] {
  const mapped: AcpToolCallContent[] = [];
  for (const part of result.content) {
    if (part.type === "text") {
      mapped.push({
        type: "content",
        content: { type: "text", text: part.text },
      });
    } else if (part.type === "diff") {
      mapped.push({
        type: "diff",
        path: part.path,
        oldText: part.oldText,
        newText: part.newText,
      });
    } else {
      mapped.push({
        type: "content",
        content: { type: "text", text: `[terminal: ${part.terminalId}]` },
      });
    }
  }
  return mapped;
}

export function mapToolEndEvent(
  toolCallId: string,
  result: AiricToolResult,
  isError: boolean,
): Extract<AgentRuntimeEvent, { type: "tool_call_end" }> {
  const text = formatToolResultText(result);
  return {
    type: "tool_call_end",
    toolCallId,
    status: isError ? "failed" : "completed",
    content: text || undefined,
    acpContent: mapToolResultToAcpContent(result),
    rawOutput: isError ? { error: text } : { result: text, details: result.details },
  };
}

export function mapToolKindForAcp(
  toolName: string,
): "read" | "edit" | "search" | "execute" | "other" {
  switch (toolName) {
    case "read":
    case "ls":
      return "read";
    case "find":
    case "grep":
      return "search";
    case "edit":
    case "write":
      return "edit";
    case "bash":
      return "execute";
    default:
      return "other";
  }
}
