import { join } from "node:path";
import type { AiricConfig } from "../ports/config-loader-port.js";
import type { ConfigLoaderPort } from "../ports/config-loader-port.js";
import type { FileSystemPort } from "../ports/file-system-port.js";
import { DocumentLoader } from "../../infrastructure/markdown/document-loader.js";
import { SpecRegistry } from "../services/spec-registry.js";
import { resolveWorkspacePath } from "../../infrastructure/config/yaml-config-loader.js";
import { syncCorePackToSpecs } from "../use-cases/bootstrap-workspace.js";

export type WorkspaceRuntime = {
  workspaceRoot: string;
  config: AiricConfig;
  baseInstruction: string;
  specRegistry: SpecRegistry;
};

export class WorkspaceRuntimeLoader {
  constructor(
    private readonly fs: FileSystemPort,
    private readonly configLoader: ConfigLoaderPort,
  ) {}

  async load(workspaceRoot: string): Promise<WorkspaceRuntime> {
    await syncCorePackToSpecs(this.fs, workspaceRoot);

    const config = await this.configLoader.load(workspaceRoot);
    const documentLoader = new DocumentLoader(this.fs);

    const baseInstructionPath = resolveWorkspacePath(
      workspaceRoot,
      join(config.packs.core, "base-instruction.md"),
    );
    const baseInstructionDoc =
      await documentLoader.loadMarkdownDocument(baseInstructionPath);

    const specRegistry = new SpecRegistry();
    const roleSpecs = await documentLoader.loadSpecDocuments(
      resolveWorkspacePath(workspaceRoot, config.specPaths.roles),
    );
    const documentTypeSpecs = await documentLoader.loadSpecDocuments(
      resolveWorkspacePath(workspaceRoot, config.specPaths.documentTypes),
    );
    const processSpecs = await documentLoader.loadSpecDocuments(
      resolveWorkspacePath(workspaceRoot, config.specPaths.processes),
    );

    specRegistry.registerAll(roleSpecs);
    specRegistry.registerAll(documentTypeSpecs);
    specRegistry.registerAll(processSpecs);

    return {
      workspaceRoot,
      config,
      baseInstruction: baseInstructionDoc.body,
      specRegistry,
    };
  }
}
