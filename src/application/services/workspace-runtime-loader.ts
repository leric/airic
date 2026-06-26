import {
  packSpecDirectory,
  resolveDocumentId,
} from "../../domain/document/document-id.js";
import type { AiricConfig } from "../ports/config-loader-port.js";
import type { ConfigLoaderPort } from "../ports/config-loader-port.js";
import type { FileSystemPort } from "../ports/file-system-port.js";
import { DocumentLoader } from "../../infrastructure/markdown/document-loader.js";
import { SpecRegistry } from "../services/spec-registry.js";
import { resolveWorkspacePath } from "../../infrastructure/config/yaml-config-loader.js";

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
    const config = await this.configLoader.load(workspaceRoot);
    const documentLoader = new DocumentLoader(this.fs);
    const corePack = config.packs.core;

    const packs = config.packs;
    const baseInstructionPath = resolveWorkspacePath(
      workspaceRoot,
      resolveDocumentId("core.base-instruction", packs),
    );
    const baseInstructionDoc =
      await documentLoader.loadMarkdownDocument(baseInstructionPath);

    const specRegistry = new SpecRegistry();
    const modeSpecs = await documentLoader.loadSpecDocuments(
      resolveWorkspacePath(
        workspaceRoot,
        packSpecDirectory(corePack, "mode"),
      ),
    );
    const documentTypeSpecs = await documentLoader.loadSpecDocuments(
      resolveWorkspacePath(
        workspaceRoot,
        packSpecDirectory(corePack, "document-type"),
      ),
    );
    const processSpecs = await documentLoader.loadSpecDocuments(
      resolveWorkspacePath(
        workspaceRoot,
        packSpecDirectory(corePack, "process"),
      ),
    );
    const toolSpecs = await documentLoader.loadSpecDocuments(
      resolveWorkspacePath(
        workspaceRoot,
        packSpecDirectory(corePack, "tool"),
      ),
    );

    specRegistry.registerAll(modeSpecs);
    specRegistry.registerAll(documentTypeSpecs);
    specRegistry.registerAll(processSpecs);
    specRegistry.registerAll(toolSpecs);

    return {
      workspaceRoot,
      config,
      baseInstruction: baseInstructionDoc.body,
      specRegistry,
    };
  }
}
