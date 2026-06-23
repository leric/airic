import type { FileSystemPort } from "../../application/ports/file-system-port.js";
import type { MarkdownDocument } from "../../domain/document/markdown-document.js";
import type { SpecDocument } from "../../domain/spec/spec-document.js";
import { parseSpecDocType, parseSpecId } from "../../domain/spec/spec-id.js";
import { parseMarkdownFrontmatter } from "./frontmatter-parser.js";

export class DocumentLoader {
  constructor(private readonly fs: FileSystemPort) {}

  async loadMarkdownDocument(path: string): Promise<MarkdownDocument> {
    const raw = await this.fs.readText(path);
    const parsed = parseMarkdownFrontmatter(raw);
    return {
      path,
      frontmatter: parsed.frontmatter,
      body: parsed.body,
    };
  }

  async loadSpecDocument(path: string): Promise<SpecDocument> {
    const doc = await this.loadMarkdownDocument(path);
    return {
      ...doc,
      id: parseSpecId(doc.frontmatter.id),
      docType: parseSpecDocType(doc.frontmatter.doc_type),
    };
  }

  async loadSpecDocuments(specDir: string): Promise<SpecDocument[]> {
    const exists = await this.fs.exists(specDir);
    if (!exists) {
      return [];
    }

    const entries = await this.fs.readDir(specDir);
    const specs: SpecDocument[] = [];

    for (const entry of entries) {
      if (!entry.endsWith(".md")) {
        continue;
      }
      specs.push(await this.loadSpecDocument(entry));
    }

    return specs;
  }
}
