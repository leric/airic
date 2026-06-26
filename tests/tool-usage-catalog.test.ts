import { describe, expect, it } from "vitest";
import { buildToolUsageText } from "../src/application/services/tool-usage-catalog.js";
import { SpecRegistry } from "../src/application/services/spec-registry.js";
import { ALL_KERNEL_TOOL_NAMES } from "../src/domain/tool/tool-names.js";
import type { SpecDocument } from "../src/domain/spec/spec-document.js";

function makeToolSpec(tool: string, body: string): SpecDocument {
  const id = `core.tool.${tool.replace(/\./g, "-")}`;
  return {
    path: `tool/${tool}.md`,
    frontmatter: {
      id,
      doc_type: "core.tool",
      tool,
      title: `${tool} Usage`,
    },
    id,
    docType: "core.tool",
    body,
  };
}

describe("buildToolUsageText", () => {
  it("renders tool sections in ALL_KERNEL_TOOL_NAMES order", () => {
    const registry = new SpecRegistry();
    registry.register(makeToolSpec("grep", "Search text across files."));
    registry.register(makeToolSpec("read", "Read file contents."));

    const text = buildToolUsageText(registry);

    expect(text.indexOf("### read")).toBeLessThan(text.indexOf("### grep"));
    expect(text).toContain("Read file contents.");
    expect(text).toContain("Search text across files.");
  });

  it("skips tools without a matching core.tool document", () => {
    const registry = new SpecRegistry();
    registry.register(makeToolSpec("read", "Read file contents."));

    const text = buildToolUsageText(registry);

    expect(text).toContain("### read");
    expect(text).not.toContain("### grep");
  });

  it("ignores core.tool docs without a tool frontmatter field", () => {
    const registry = new SpecRegistry();
    registry.register({
      path: "document-type/tool.md",
      frontmatter: {
        id: "core.document-type.tool",
        doc_type: "core.document-type",
      },
      id: "core.document-type.tool",
      docType: "core.document-type",
      body: "Kind definition — not a usage instance.",
    });
    registry.register(makeToolSpec("read", "Read file contents."));

    const text = buildToolUsageText(registry);

    expect(text).toContain("### read");
    expect(text).not.toContain("Kind definition");
  });
});

describe("core.tool sync guard", () => {
  it("every kernel tool name has exactly one core.tool document after bootstrap", async () => {
    const { mkdtemp } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const { tmpdir } = await import("node:os");
    const { bootstrapWorkspace } = await import(
      "../src/application/use-cases/bootstrap-workspace.js"
    );
    const { NodeFileSystem } = await import(
      "../src/infrastructure/fs/node-file-system.js"
    );
    const { YamlConfigLoader } = await import(
      "../src/infrastructure/config/yaml-config-loader.js"
    );
    const { WorkspaceRuntimeLoader } = await import(
      "../src/application/services/workspace-runtime-loader.js"
    );

    const fs = new NodeFileSystem();
    const workspaceRoot = await mkdtemp(join(tmpdir(), "airic-tool-sync-"));
    await bootstrapWorkspace(fs, workspaceRoot);

    const runtime = await new WorkspaceRuntimeLoader(
      fs,
      new YamlConfigLoader(fs),
    ).load(workspaceRoot);

    const toolDocs = runtime.specRegistry.listByDocType("core.tool");
    const byToolName = new Map(
      toolDocs.map((doc) => [String(doc.frontmatter.tool ?? ""), doc]),
    );

    for (const name of ALL_KERNEL_TOOL_NAMES) {
      expect(byToolName.has(name), `missing core.tool doc for ${name}`).toBe(
        true,
      );
    }

    expect(toolDocs.length).toBe(ALL_KERNEL_TOOL_NAMES.length);
  });
});
