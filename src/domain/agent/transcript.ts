export type ToolCallRecord = {
  id: string;
  name: string;
  arguments: string;
};

export type TranscriptMessage =
  | { role: "user"; content: string; timestamp: string }
  | {
      role: "assistant";
      content: string;
      timestamp: string;
      toolCalls?: ToolCallRecord[];
    }
  | {
      role: "tool_result";
      toolCallId: string;
      content: string;
      isError?: boolean;
      timestamp: string;
    };

export function projectChatSummary(
  transcript: TranscriptMessage[],
): Array<{ role: "user" | "assistant"; content: string }> {
  const summary: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const message of transcript) {
    if (message.role === "user" || message.role === "assistant") {
      summary.push({ role: message.role, content: message.content });
    }
  }
  return summary;
}

export function bootstrapTranscriptFromMessages(
  messages: Array<{ role: string; content: string }>,
): TranscriptMessage[] {
  const now = new Date().toISOString();
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
      timestamp: now,
    }));
}
