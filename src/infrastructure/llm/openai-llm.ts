import OpenAI from "openai";
import type {
  LlmMessage,
  LlmPort,
  LlmStreamChunk,
} from "../../application/ports/llm-port.js";
import type { AiricConfig } from "../../application/ports/config-loader-port.js";

export class OpenAiLlm implements LlmPort {
  private readonly client: OpenAI;

  constructor(private readonly config: AiricConfig["llm"]) {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async *streamChat(
    messages: LlmMessage[],
    options?: { signal?: AbortSignal },
  ): AsyncIterable<LlmStreamChunk> {
    const stream = await this.client.chat.completions.create(
      {
        model: this.config.model,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        messages,
        stream: true,
      },
      { signal: options?.signal },
    );

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content;
      if (text) {
        yield { type: "text", text };
      }
    }
  }
}

export class OpenAiLlmFactory {
  create(config: AiricConfig): LlmPort {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error(
        "OPENAI_API_KEY environment variable is required for OpenAI LLM provider",
      );
    }
    return new OpenAiLlm(config.llm);
  }
}
