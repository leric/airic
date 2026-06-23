export type SpecDocType = "core.role" | "core.document-type" | "core.process";

export function parseSpecId(raw: unknown): string {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    throw new Error("Spec document requires a non-empty id in frontmatter");
  }
  return raw.trim();
}

export function parseSpecDocType(raw: unknown): SpecDocType {
  if (
    raw === "core.role" ||
    raw === "core.document-type" ||
    raw === "core.process"
  ) {
    return raw;
  }
  throw new Error(`Unsupported spec doc_type: ${String(raw)}`);
}
