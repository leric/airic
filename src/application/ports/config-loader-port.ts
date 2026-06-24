export type LlmProvider =
  | "openai"
  | "anthropic"
  | "openrouter"
  | (string & {});

export type ThinkingLevel =
  | "off"
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "xhigh";

export type AiricConfig = {
  defaultMode: string;
  llm: {
    provider: LlmProvider;
    model: string;
    baseUrl?: string;
    apiKey?: string;
    temperature: number;
    maxTokens: number;
    thinkingLevel: ThinkingLevel;
  };
  packs: {
    core: string;
  };
  specPaths: {
    modes: string;
    documentTypes: string;
    processes: string;
  };
  editing: {
    requireConfirmation: boolean;
  };
  cache: {
    enabled: boolean;
  };
};

export type ConfigLoaderPort = {
  load(workspaceRoot: string): Promise<AiricConfig>;
};
