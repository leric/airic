import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { bootstrapWorkspace } from "../src/application/use-cases/bootstrap-workspace.js";
import { NodeFileSystem } from "../src/infrastructure/fs/node-file-system.js";
import { YamlConfigLoader } from "../src/infrastructure/config/yaml-config-loader.js";
import { WorkspaceRuntimeLoader } from "../src/application/services/workspace-runtime-loader.js";

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

    const configLoader = new YamlConfigLoader(fs);
    const runtimeLoader = new WorkspaceRuntimeLoader(fs, configLoader);
    const runtime = await runtimeLoader.load(workspaceRoot);

    const mode = runtime.specRegistry.require("core.thinking-partner");
    expect(mode.docType).toBe("core.mode");
    expect(runtime.baseInstruction).toContain("Airic Kernel");
    expect(runtime.prompts.sumupSystem).toContain("return summary");
    expect(runtime.prompts.sumupUser).toContain("{{resumePoint}}");
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
