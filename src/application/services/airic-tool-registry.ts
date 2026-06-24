import type { AiricToolDefinition } from "../../domain/tool/tool.js";
import type { ToolRegistryPort } from "../ports/tool-registry-port.js";

export class AiricToolRegistry implements ToolRegistryPort {
  private readonly tools = new Map<string, AiricToolDefinition>();

  constructor(tools: AiricToolDefinition[]) {
    for (const tool of tools) {
      this.tools.set(tool.name, tool);
    }
  }

  get(name: string): AiricToolDefinition | undefined {
    return this.tools.get(name);
  }

  list(): AiricToolDefinition[] {
    return [...this.tools.values()];
  }
}
