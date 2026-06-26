import { join } from "node:path";
import type { AiricConfig } from "../ports/config-loader-port.js";
import type { ConfigLoaderPort } from "../ports/config-loader-port.js";
import type { FileSystemPort } from "../ports/file-system-port.js";
import { DocumentLoader } from "../../infrastructure/markdown/document-loader.js";
import { SpecRegistry } from "../services/spec-registry.js";
import { resolveWorkspacePath } from "../../infrastructure/config/yaml-config-loader.js";
import { syncCorePackToSpecs } from "../use-cases/bootstrap-workspace.js";

export type WorkspacePrompts = {
  sumupSystem: string;
  sumupUser: string;
};

export type WorkspaceRuntime = {
  workspaceRoot: string;
  config: AiricConfig;
  baseInstruction: string;
  prompts: WorkspacePrompts;
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

    const promptPath = (fileName: string) =>
      resolveWorkspacePath(
        workspaceRoot,
        join(config.packs.core, "prompts", fileName),
      );
    const sumupSystemDoc = await documentLoader.loadMarkdownDocument(
      promptPath("sumup-system.md"),
    );
    const sumupUserDoc = await documentLoader.loadMarkdownDocument(
      promptPath("sumup-user.md"),
    );

    const specRegistry = new SpecRegistry();
    const modeSpecs = await documentLoader.loadSpecDocuments(
      resolveWorkspacePath(workspaceRoot, config.specPaths.modes),
    );
    const documentTypeSpecs = await documentLoader.loadSpecDocuments(
      resolveWorkspacePath(workspaceRoot, config.specPaths.documentTypes),
    );
    const processSpecs = await documentLoader.loadSpecDocuments(
      resolveWorkspacePath(workspaceRoot, config.specPaths.processes),
    );
    const toolSpecs = await documentLoader.loadSpecDocuments(
      resolveWorkspacePath(workspaceRoot, join(config.packs.core, "tools")),
    );

    specRegistry.registerAll(modeSpecs);
    specRegistry.registerAll(documentTypeSpecs);
    specRegistry.registerAll(processSpecs);
    specRegistry.registerAll(toolSpecs);

    return {
      workspaceRoot,
      config,
      baseInstruction: baseInstructionDoc.body,
      prompts: {
        sumupSystem: sumupSystemDoc.body,
        sumupUser: sumupUserDoc.body,
      },
      specRegistry,
    };
  }
}
