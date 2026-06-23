export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LlmStreamChunk = {
  type: "text";
  text: string;
};

export interface LlmPort {
  streamChat(
    messages: LlmMessage[],
    options?: { signal?: AbortSignal },
  ): AsyncIterable<LlmStreamChunk>;
}
