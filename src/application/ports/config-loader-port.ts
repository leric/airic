export type AiricConfig = {
  defaultRole: string;
  llm: {
    provider: "openai";
    model: string;
    temperature: number;
    maxTokens: number;
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
