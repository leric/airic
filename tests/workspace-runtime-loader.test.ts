import { mkdtemp, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { bootstrapWorkspace } from "../src/application/use-cases/bootstrap-workspace.js";
import { listAvailableModes } from "../src/application/services/mode-catalog.js";
import { NodeFileSystem } from "../src/infrastructure/fs/node-file-system.js";
import { YamlConfigLoader } from "../src/infrastructure/config/yaml-config-loader.js";
import { WorkspaceRuntimeLoader } from "../src/application/services/workspace-runtime-loader.js";

describe("WorkspaceRuntimeLoader", () => {
  it("loads mode specs from all configured packs", async () => {
    const fs = new NodeFileSystem();
    const workspaceRoot = await mkdtemp(join(tmpdir(), "airic-test-"));

    await bootstrapWorkspace(fs, workspaceRoot);

    const configPath = join(workspaceRoot, ".airic", "config.yml");
    await writeFile(
      configPath,
      [
        "default_mode: core.mode.thinking-partner",
        "",
        "packs:",
        "  core: .airic/packs/core",
        "  packman: .airic/packs/packman",
        "",
      ].join("\n"),
      "utf8",
    );

    const packmanModeDir = join(
      workspaceRoot,
      ".airic",
      "packs",
      "packman",
      "mode",
    );
    await mkdir(packmanModeDir, { recursive: true });
    await writeFile(
      join(packmanModeDir, "packsmith.md"),
      [
        "---",
        "id: packman.mode.packsmith",
        "doc_type: core.mode",
        "title: PackSmith",
        "description: Build extension packs from tacit methodology.",
        "---",
        "",
        "Pack builder mode.",
      ].join("\n"),
      "utf8",
    );

    const runtime = await new WorkspaceRuntimeLoader(
      fs,
      new YamlConfigLoader(fs),
    ).load(workspaceRoot);

    expect(runtime.config.packs).toEqual({
      core: ".airic/packs/core",
      packman: ".airic/packs/packman",
    });

    const modes = listAvailableModes(runtime.specRegistry);
    expect(modes.map((mode) => mode.id)).toContain("packman.mode.packsmith");
    expect(modes.map((mode) => mode.id)).toContain("core.mode.thinking-partner");
  });
});
