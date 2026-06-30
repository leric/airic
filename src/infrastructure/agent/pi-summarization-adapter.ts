import type { AiricConfig } from "../../application/ports/config-loader-port.js";
import type { SummarizationPort } from "../../application/ports/summarization-port.js";
import { PiModelResolver } from "./pi-model-resolver.js";

const MINIMAL_SYSTEM_PROMPT =
  "Summarize the following conversation excerpt according to the user's instructions.";

export class PiSummarizationAdapter implements SummarizationPort {
  constructor(private readonly modelResolver: PiModelResolver = new PiModelResolver()) {}

  async summarize(input: {
    sourceText: string;
    prompt: string;
    llm: AiricConfig["llm"];
    signal?: AbortSignal;
  }): Promise<string> {
    const model = this.modelResolver.resolve(input.llm);
    const userContent = `${input.prompt.trim()}\n\n---\n\n${input.sourceText}`;

    const message = await this.modelResolver.models.completeSimple(
      model,
      {
        systemPrompt: MINIMAL_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: userContent,
            timestamp: Date.now(),
          },
        ],
      },
      {
        signal: input.signal,
        temperature: input.llm.temperature,
        maxTokens: input.llm.maxTokens,
      },
    );

    const text = message.content
      .filter((part): part is { type: "text"; text: string } => part.type === "text")
      .map((part) => part.text)
      .join("")
      .trim();

    if (!text) {
      throw new Error("Summarization produced empty output.");
    }

    return text;
  }
}
