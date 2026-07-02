import type {
  ToolCallRecord,
  TranscriptMessage,
} from "../agent/transcript.js";

export type ToolActionStatus = "ok" | "failed" | "rejected";

export type CompactToolTraceOptions = {
  /** Injected by application layer (KernelToolRegistry.presentToolCall). */
  describeCall?: (name: string, args: Record<string, unknown>) => string;
};

export function deriveToolResultStatus(
  message: Extract<TranscriptMessage, { role: "tool_result" }>,
): ToolActionStatus {
  if (message.isError) {
    return "failed";
  }
  if (message.content.includes("rejected")) {
    return "rejected";
  }
  return "ok";
}

function parseToolArguments(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function describeToolCall(
  call: ToolCallRecord,
  options?: CompactToolTraceOptions,
): string {
  const args = parseToolArguments(call.arguments);
  return options?.describeCall?.(call.name, args) ?? call.name;
}

export function compactToolTraceForProjection(
  toolTrace: TranscriptMessage[],
  options?: CompactToolTraceOptions,
): TranscriptMessage[] {
  const pendingCalls = new Map<string, ToolCallRecord>();

  return toolTrace.map((message) => {
    if (message.role === "assistant" && message.toolCalls) {
      for (const toolCall of message.toolCalls) {
        pendingCalls.set(toolCall.id, toolCall);
      }
      return message;
    }

    if (message.role === "tool_result") {
      const call = pendingCalls.get(message.toolCallId);
      const title = call ? describeToolCall(call, options) : "tool";
      const status = deriveToolResultStatus(message);
      return {
        ...message,
        content: `${title} — ${status}`,
      };
    }

    return message;
  });
}

export function appendCompactToolTrace(
  messages: TranscriptMessage[],
  toolTrace: TranscriptMessage[],
  options?: CompactToolTraceOptions & { skipLeadingUser?: boolean },
): void {
  const compact = compactToolTraceForProjection(toolTrace, options);
  let startIndex = 0;
  if (options?.skipLeadingUser && compact[0]?.role === "user") {
    startIndex = 1;
  } else if (messages.some((message) => message.role === "user")) {
    startIndex = compact[0]?.role === "user" ? 1 : 0;
  }
  messages.push(...compact.slice(startIndex));
}
