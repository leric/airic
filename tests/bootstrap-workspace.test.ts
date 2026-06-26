import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { bootstrapWorkspace } from "../src/application/use-cases/bootstrap-workspace.js";
import { NodeFileSystem } from "../src/infrastructure/fs/node-file-system.js";
import { YamlConfigLoader } from "../src/infrastructure/config/yaml-config-loader.js";
import { WorkspaceRuntimeLoader } from "../src/application/services/workspace-runtime-loader.js";
import { buildToolUsageText } from "../src/application/services/tool-usage-catalog.js";

describe("bootstrapWorkspace", () => {
  it("creates .airic structure and loads mode spec", async () => {
    const fs = new NodeFileSystem();
    const workspaceRoot = await mkdtemp(join(tmpdir(), "airic-test-"));

    await bootstrapWorkspace(fs, workspaceRoot);

    const configPath = join(workspaceRoot, ".airic", "config.yml");
    const modeSpecPath = join(
      workspaceRoot,
      ".airic",
      "specs",
      "modes",
      "thinking-partner.md",
    );

    await expect(readFile(configPath, "utf8")).resolves.toContain(
      "core.thinking-partner",
    );
    await expect(readFile(modeSpecPath, "utf8")).resolves.toContain(
      "Thinking Partner",
    );

    const toolKindPath = join(
      workspaceRoot,
      ".airic",
      "packs",
      "core",
      "document-types",
      "tool.md",
    );
    await expect(readFile(toolKindPath, "utf8")).resolves.toContain(
      "core.tool",
    );

    const configLoader = new YamlConfigLoader(fs);
    const runtimeLoader = new WorkspaceRuntimeLoader(fs, configLoader);
    const runtime = await runtimeLoader.load(workspaceRoot);

    const mode = runtime.specRegistry.require("core.thinking-partner");
    expect(mode.docType).toBe("core.mode");
    expect(runtime.baseInstruction).toContain("thinking partner");
    expect(runtime.specRegistry.get("core.task")?.docType).toBe("core.document-type");

    const toolDocs = runtime.specRegistry.listByDocType("core.tool");
    expect(toolDocs.length).toBeGreaterThanOrEqual(12);
    expect(runtime.specRegistry.get("core.tool.read")?.docType).toBe("core.tool");
    expect(buildToolUsageText(runtime.specRegistry)).toContain("### read");
  });

  it("does not overwrite existing mode specs", async () => {
    const fs = new NodeFileSystem();
    const workspaceRoot = await mkdtemp(join(tmpdir(), "airic-test-"));

    await bootstrapWorkspace(fs, workspaceRoot);

    const modeSpecPath = join(
      workspaceRoot,
      ".airic",
      "specs",
      "modes",
      "thinking-partner.md",
    );

    await writeFile(modeSpecPath, "CUSTOM MODE SPEC", "utf8");
    await bootstrapWorkspace(fs, workspaceRoot);

    await expect(readFile(modeSpecPath, "utf8")).resolves.toBe(
      "CUSTOM MODE SPEC",
    );
  });
});
