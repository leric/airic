import type { FileSystemPort } from "../../application/ports/file-system-port.js";
import type { SessionStorePort } from "../../application/ports/session-store-port.js";
import type { ToolRegistryPort } from "../../application/ports/tool-registry-port.js";
import { AiricToolRegistry } from "../../application/services/airic-tool-registry.js";
import type { SpecRegistry } from "../../application/services/spec-registry.js";
import type { AiricToolDefinition } from "../../domain/tool/tool.js";
import { createBashTool } from "./shell/bash-tool.js";
import { createEditTool } from "./file/edit-tool.js";
import { createFindTool } from "./file/find-tool.js";
import { createGrepTool } from "./file/grep-tool.js";
import { createLsTool } from "./file/ls-tool.js";
import { createReadTool } from "./file/read-tool.js";
import { createWriteTool } from "./file/write-tool.js";
import { createProcessTools } from "./process/create-process-tools.js";

export type ToolRegistryDeps = {
  fs: FileSystemPort;
  sessionStore: SessionStorePort;
  specRegistry: SpecRegistry;
};

export function createDefaultToolRegistry(deps: ToolRegistryDeps): ToolRegistryPort {
  const tools: AiricToolDefinition[] = [
    createReadTool(),
    createLsTool(),
    createFindTool(),
    createGrepTool({ fs: deps.fs }),
    createEditTool(),
    createWriteTool(),
    createBashTool(),
    ...createProcessTools({
      sessionStore: deps.sessionStore,
      specRegistry: deps.specRegistry,
    }),
  ];
  return new AiricToolRegistry(tools);
}
