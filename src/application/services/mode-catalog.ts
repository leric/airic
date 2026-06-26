import { DOCUMENT_TYPE_META_IDS } from "../../domain/document/document-id.js";
import type { SpecRegistry } from "./spec-registry.js";

export type ModeSummary = {
  id: string;
  name: string;
  description?: string;
};

export function listAvailableModes(specRegistry: SpecRegistry): ModeSummary[] {
  return specRegistry
    .listByDocType("core.mode")
    .filter((spec) => spec.id !== DOCUMENT_TYPE_META_IDS.mode)
    .map((spec) => ({
      id: spec.id,
      name: readTitle(spec.frontmatter.title, spec.id),
      description: readOptionalDescription(spec.frontmatter.description),
    }));
}

function readTitle(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function readOptionalDescription(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
