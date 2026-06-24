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
  defaultRole: string;
  llm: {
    provider: LlmProvider;
    model: string;
    temperature: number;
    maxTokens: number;
    thinkingLevel: ThinkingLevel;
  };
  packs: {
    core: string;
  };
  specPaths: {
    roles: string;
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
