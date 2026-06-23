import type { SpecDocument } from "../../domain/spec/spec-document.js";

export class SpecRegistry {
  private readonly byId = new Map<string, SpecDocument>();

  register(spec: SpecDocument): void {
    this.byId.set(spec.id, spec);
  }

  registerAll(specs: SpecDocument[]): void {
    for (const spec of specs) {
      this.register(spec);
    }
  }

  get(id: string): SpecDocument | undefined {
    return this.byId.get(id);
  }

  require(id: string): SpecDocument {
    const spec = this.get(id);
    if (!spec) {
      throw new Error(`Spec not found: ${id}`);
    }
    return spec;
  }

  listByDocType(docType: SpecDocument["docType"]): SpecDocument[] {
    return [...this.byId.values()].filter((spec) => spec.docType === docType);
  }

  clear(): void {
    this.byId.clear();
  }
}
