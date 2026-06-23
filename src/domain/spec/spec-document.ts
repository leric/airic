import type { MarkdownDocument } from "../document/markdown-document.js";
import type { SpecDocType } from "./spec-id.js";

export type SpecDocument = MarkdownDocument & {
  id: string;
  docType: SpecDocType;
};
