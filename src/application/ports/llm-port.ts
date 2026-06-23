export type LlmToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type LlmToolCall = {
  id: string;
  name: string;
  arguments: string;
};

export type LlmMessage =
  | {
      role: "system" | "user";
      content: string;
    }
  | {
      role: "assistant";
      content: string | null;
      toolCalls?: LlmToolCall[];
    }
  | {
      role: "tool";
      toolCallId: string;
      content: string;
    };

export type LlmChatResult = {
  text: string;
  toolCalls: LlmToolCall[];
};

export interface LlmPort {
  chatWithTools(
    messages: LlmMessage[],
    tools: LlmToolDefinition[],
    options?: { signal?: AbortSignal },
  ): Promise<LlmChatResult>;
}

export type LlmStreamChunk = {
  type: "text";
  text: string;
};
