import type { AiricToolDefinition } from "../../domain/tool/tool.js";

export interface ToolRegistryPort {
  get(name: string): AiricToolDefinition | undefined;
  list(): AiricToolDefinition[];
}
