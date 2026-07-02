import {
  packSpecDirectory,
  resolveDocumentId,
  type PackConfig,
} from "../../domain/document/document-id.js";
import type { SpecDocument } from "../../domain/spec/spec-document.js";
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
    const packs = config.packs;
    const baseInstructionPath = resolveWorkspacePath(
      workspaceRoot,
      resolveDocumentId("core.base-instruction", packs),
    );
    const baseInstructionDoc =
      await documentLoader.loadMarkdownDocument(baseInstructionPath);

    const specRegistry = new SpecRegistry();
    const packPaths = listPackPathsInLoadOrder(packs);
    const modeSpecs = await loadSpecDocumentsFromPacks(
      documentLoader,
      workspaceRoot,
      packPaths,
      "mode",
    );
    const documentTypeSpecs = await loadSpecDocumentsFromPacks(
      documentLoader,
      workspaceRoot,
      packPaths,
      "document-type",
    );
    const processSpecs = await loadSpecDocumentsFromPacks(
      documentLoader,
      workspaceRoot,
      packPaths,
      "process",
    );
    const toolSpecs = await loadSpecDocumentsFromPacks(
      documentLoader,
      workspaceRoot,
      packPaths,
      "tool",
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

function listPackPathsInLoadOrder(packs: PackConfig): string[] {
  const paths = [packs.core];
  for (const [name, path] of Object.entries(packs)) {
    if (name !== "core") {
      paths.push(path);
    }
  }
  return paths;
}

async function loadSpecDocumentsFromPacks(
  documentLoader: DocumentLoader,
  workspaceRoot: string,
  packPaths: string[],
  subdirectory: string,
): Promise<SpecDocument[]> {
  const specs: SpecDocument[] = [];

  for (const packPath of packPaths) {
    const packSpecs = await documentLoader.loadSpecDocuments(
      resolveWorkspacePath(
        workspaceRoot,
        packSpecDirectory(packPath, subdirectory),
      ),
    );
    specs.push(...packSpecs);
  }

  return specs;
}
