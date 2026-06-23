import type { FileSystemPort } from "../ports/file-system-port.js";
import type { Session } from "../../domain/session/session.js";
import type { SpecDocument } from "../../domain/spec/spec-document.js";
import { parseMarkdownFrontmatter } from "../../infrastructure/markdown/frontmatter-parser.js";
import { resolveDocumentTypeSpec } from "./document-type-resolver.js";
import type { SpecRegistry } from "./spec-registry.js";
import { PathResolver } from "./path-resolver.js";

export type CurrentDocumentContext = {
  path: string;
  relativePath: string;
  content: string;
  docType?: string;
  documentTypeSpec?: SpecDocument;
};

export async function loadCurrentDocumentContext(
  fs: FileSystemPort,
  session: Session,
  specRegistry: SpecRegistry,
): Promise<CurrentDocumentContext | undefined> {
  if (!session.currentDocument) {
    return undefined;
  }

  const pathResolver = new PathResolver(session.workspaceRoot);
  const path = pathResolver.resolve(session.currentDocument);
  const exists = await fs.exists(path);
  if (!exists) {
    return undefined;
  }

  const content = await fs.readText(path);
  const parsed = parseMarkdownFrontmatter(content);
  const docType =
    typeof parsed.frontmatter.doc_type === "string"
      ? parsed.frontmatter.doc_type
      : undefined;

  const documentTypeSpec = docType
    ? resolveDocumentTypeSpec(docType, specRegistry)
    : undefined;

  return {
    path,
    relativePath: pathResolver.toRelative(path),
    content,
    docType,
    documentTypeSpec,
  };
}
