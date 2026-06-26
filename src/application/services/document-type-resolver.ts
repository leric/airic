import {
  documentTypeToSpecId,
  resolveDocumentId,
  type PackConfig,
} from "../../domain/document/document-id.js";
import type { SpecRegistry } from "./spec-registry.js";

export function resolveDocumentTypeSpec(
  docType: string,
  registry: SpecRegistry,
) {
  return registry.get(documentTypeToSpecId(docType));
}

export function docTypeToSpecFileHint(
  docType: string,
  packs: PackConfig,
): string {
  return resolveDocumentId(documentTypeToSpecId(docType), packs);
}
