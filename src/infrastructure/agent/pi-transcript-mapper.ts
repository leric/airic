import type { TranscriptMessage } from "../../domain/agent/transcript.js";

export type PiMessage = import("@earendil-works/pi-ai").Message;

export function toPiMessages(
  transcript: TranscriptMessage[],
  defaults: { provider: string; model: string; api: string },
): PiMessage[] {
  const messages: PiMessage[] = [];

  for (const entry of transcript) {
    if (entry.role === "user") {
      messages.push({
        role: "user",
        content: entry.content,
        timestamp: Date.parse(entry.timestamp),
      });
      continue;
    }

    if (entry.role === "assistant") {
      const content: Array<
        | { type: "text"; text: string }
        | {
            type: "toolCall";
            id: string;
            name: string;
            arguments: Record<string, unknown>;
          }
      > = [];

      if (entry.content) {
        content.push({ type: "text", text: entry.content });
      }

      for (const toolCall of entry.toolCalls ?? []) {
        content.push({
          type: "toolCall",
          id: toolCall.id,
          name: toolCall.name,
          arguments: safeParseJson(toolCall.arguments),
        });
      }

      messages.push({
        role: "assistant",
        content,
        api: defaults.api as import("@earendil-works/pi-ai").Api,
        provider: defaults.provider,
        model: defaults.model,
        usage: emptyUsage(),
        stopReason: entry.toolCalls?.length ? "toolUse" : "stop",
        timestamp: Date.parse(entry.timestamp),
      });
      continue;
    }

    messages.push({
      role: "toolResult",
      toolCallId: entry.toolCallId,
      toolName: findToolName(transcript, entry.toolCallId),
      content: [{ type: "text", text: entry.content }],
      isError: entry.isError ?? false,
      timestamp: Date.parse(entry.timestamp),
    });
  }

  return messages;
}

export function fromPiMessages(messages: PiMessage[]): TranscriptMessage[] {
  const transcript: TranscriptMessage[] = [];

  for (const message of messages) {
    if (message.role === "user") {
      transcript.push({
        role: "user",
        content: extractTextContent(message.content),
        timestamp: new Date(message.timestamp).toISOString(),
      });
      continue;
    }

    if (message.role === "assistant") {
      const textParts = message.content
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("");
      const toolCalls = message.content
        .filter((part) => part.type === "toolCall")
        .map((part) => ({
          id: part.id,
          name: part.name,
          arguments: JSON.stringify(part.arguments),
        }));

      transcript.push({
        role: "assistant",
        content: textParts,
        timestamp: new Date(message.timestamp).toISOString(),
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      });
      continue;
    }

    transcript.push({
      role: "tool_result",
      toolCallId: message.toolCallId,
      content: extractTextContent(message.content),
      isError: message.isError,
      timestamp: new Date(message.timestamp).toISOString(),
    });
  }

  return transcript;
}

function findToolName(
  transcript: TranscriptMessage[],
  toolCallId: string,
): string {
  for (const entry of transcript) {
    if (entry.role !== "assistant") {
      continue;
    }
    const match = entry.toolCalls?.find((call) => call.id === toolCallId);
    if (match) {
      return match.name;
    }
  }
  return "unknown_tool";
}

function extractTextContent(
  content: string | Array<{ type: string; text?: string }>,
): string {
  if (typeof content === "string") {
    return content;
  }
  return content
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text as string)
    .join("");
}

function safeParseJson(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function emptyUsage(): import("@earendil-works/pi-ai").Usage {
  return {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 0,
    cost: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      total: 0,
    },
  };
}

export function extractAssistantText(messages: PiMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === "assistant") {
      return extractTextContent(message.content);
    }
  }
  return "";
}
