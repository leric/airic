import { describe, expect, it } from "vitest";
import {
  documentTypeToSpecId,
  pathToDocumentId,
  packSpecDirectory,
  resolveDocumentId,
} from "../src/domain/document/document-id.js";

const packs = { core: ".airic/packs/core" };

describe("resolveDocumentId", () => {
  it("resolves airic namespace paths", () => {
    expect(resolveDocumentId("airic.base-instruction", packs)).toBe(
      ".airic/base-instruction.md",
    );
    expect(resolveDocumentId("airic.cache.some-key", packs)).toBe(
      ".airic/cache/some-key.md",
    );
  });

  it("resolves workspace namespace paths", () => {
    expect(resolveDocumentId("ws.docs.api.overview", packs)).toBe(
      "docs/api/overview.md",
    );
    expect(resolveDocumentId("ws.README", packs)).toBe("README.md");
    expect(resolveDocumentId("ws.docker-compose.yml", packs)).toBe(
      "docker-compose.yml",
    );
    expect(resolveDocumentId("ws.src.main.ts", packs)).toBe("src/main.ts");
  });

  it("resolves pack namespace paths mechanically", () => {
    expect(resolveDocumentId("core.tool.read", packs)).toBe(
      ".airic/packs/core/tool/read.md",
    );
    expect(resolveDocumentId("core.document-type.tool", packs)).toBe(
      ".airic/packs/core/document-type/tool.md",
    );
    expect(resolveDocumentId("core.mode.thinking-partner", packs)).toBe(
      ".airic/packs/core/mode/thinking-partner.md",
    );
    expect(resolveDocumentId("core.process.precedent-extraction", packs)).toBe(
      ".airic/packs/core/process/precedent-extraction.md",
    );
  });

  it("resolves pack root files", () => {
    expect(resolveDocumentId("core.base-instruction", packs)).toBe(
      ".airic/packs/core/base-instruction.md",
    );
  });

  it("rejects unknown namespaces", () => {
    expect(() => resolveDocumentId("unknown.foo", packs)).toThrow(
      "Unknown namespace: unknown",
    );
  });
});

describe("pathToDocumentId", () => {
  it("reverses pack, airic, and workspace paths", () => {
    expect(
      pathToDocumentId(".airic/packs/core/tool/read.md", packs),
    ).toBe("core.tool.read");
    expect(
      pathToDocumentId(".airic/packs/core/document-type/tool.md", packs),
    ).toBe("core.document-type.tool");
    expect(
      pathToDocumentId(".airic/base-instruction.md", packs),
    ).toBe("airic.base-instruction");
    expect(pathToDocumentId("docs/api/overview.md", packs)).toBe(
      "ws.docs.api.overview",
    );
    expect(pathToDocumentId("docker-compose.yml", packs)).toBe(
      "ws.docker-compose.yml",
    );
  });
});

describe("documentTypeToSpecId", () => {
  it("maps doc_type values to document-type spec ids", () => {
    expect(documentTypeToSpecId("core.tool")).toBe("core.document-type.tool");
    expect(documentTypeToSpecId("core.mode")).toBe("core.document-type.mode");
    expect(documentTypeToSpecId("core.task")).toBe("core.document-type.task");
    expect(documentTypeToSpecId("core.document-type")).toBe(
      "core.document-type.document-type",
    );
  });
});

describe("packSpecDirectory", () => {
  it("joins pack path with subdirectory segment", () => {
    expect(packSpecDirectory(".airic/packs/core", "tool")).toBe(
      ".airic/packs/core/tool",
    );
  });
});
