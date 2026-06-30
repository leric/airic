import type { FileSystemPort } from "../ports/file-system-port.js";
import type { Session } from "../../domain/session/session.js";
import { parseMarkdownFrontmatter } from "../../infrastructure/markdown/frontmatter-parser.js";
import { resolveDocumentTypeSpec } from "./document-type-resolver.js";
import type { SpecRegistry } from "./spec-registry.js";
import { PathResolver } from "./path-resolver.js";
import type { CurrentDocumentContext } from "./current-document-context.js";

export async function setActiveDocument(
  fs: FileSystemPort,
  session: Session,
  specRegistry: SpecRegistry,
  documentPath: string,
): Promise<CurrentDocumentContext> {
  const pathResolver = new PathResolver(session.workspaceRoot);
  const path = pathResolver.resolve(documentPath);
  const exists = await fs.exists(path);
  if (!exists) {
    throw new Error(`Document not found: ${documentPath}`);
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

  session.currentDocument = path;
  session.updatedAt = new Date().toISOString();

  return {
    path,
    relativePath: pathResolver.toRelative(path),
    content,
    docType,
    documentTypeSpec,
  };
}

export function clearActiveDocument(session: Session): void {
  session.currentDocument = undefined;
  session.updatedAt = new Date().toISOString();
}
