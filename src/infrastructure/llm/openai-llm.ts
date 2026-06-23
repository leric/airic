import OpenAI from "openai";
import type {
  LlmChatResult,
  LlmMessage,
  LlmPort,
  LlmToolCall,
  LlmToolDefinition,
} from "../../application/ports/llm-port.js";
import type { AiricConfig } from "../../application/ports/config-loader-port.js";

export class OpenAiLlm implements LlmPort {
  private readonly client: OpenAI;

  constructor(private readonly config: AiricConfig["llm"]) {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async chatWithTools(
    messages: LlmMessage[],
    tools: LlmToolDefinition[],
    options?: { signal?: AbortSignal },
  ): Promise<LlmChatResult> {
    const response = await this.client.chat.completions.create(
      {
        model: this.config.model,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        messages: toOpenAiMessages(messages),
        tools: tools.map((tool) => ({
          type: "function" as const,
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          },
        })),
        tool_choice: "auto",
      },
      { signal: options?.signal },
    );

    const choice = response.choices[0];
    if (!choice) {
      return { text: "", toolCalls: [] };
    }

    const message = choice.message;
    const toolCalls = (message.tool_calls ?? []).map((call) => {
      if (call.type !== "function") {
        throw new Error(`Unsupported tool call type: ${call.type}`);
      }
      return {
        id: call.id,
        name: call.function.name,
        arguments: call.function.arguments,
      } satisfies LlmToolCall;
    });

    return {
      text: message.content ?? "",
      toolCalls,
    };
  }
}

function toOpenAiMessages(messages: LlmMessage[]): OpenAI.ChatCompletionMessageParam[] {
  return messages.map((message) => {
    if (message.role === "tool") {
      return {
        role: "tool",
        tool_call_id: message.toolCallId,
        content: message.content,
      };
    }

    if (message.role === "assistant") {
      return {
        role: "assistant",
        content: message.content,
        tool_calls: message.toolCalls?.map((call) => ({
          id: call.id,
          type: "function" as const,
          function: {
            name: call.name,
            arguments: call.arguments,
          },
        })),
      };
    }

    return {
      role: message.role,
      content: message.content,
    };
  });
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
