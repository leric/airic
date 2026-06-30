import type { AiricConfig } from "./config-loader-port.js";

export interface SummarizationPort {
  summarize(input: {
    sourceText: string;
    prompt: string;
    llm: AiricConfig["llm"];
    signal?: AbortSignal;
  }): Promise<string>;
}
