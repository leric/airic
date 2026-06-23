import type { SpecRegistry } from "./spec-registry.js";

export function resolveDocumentTypeSpec(
  docType: string,
  registry: SpecRegistry,
) {
  return registry.get(docType);
}

export function docTypeToSpecFileHint(docType: string): string {
  const segment = docType.includes(".")
    ? docType.split(".").pop()!
    : docType;
  return `${segment}.md`;
}
