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
    /**
     * Maximum number of tool-call rounds the agent may take in a single turn
     * before being force-terminated. Guards against runaway loops while leaving
     * enough headroom for long, multi-step tasks.
     */
    maxToolRounds: number;
  };
  packs: {
    core: string;
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
