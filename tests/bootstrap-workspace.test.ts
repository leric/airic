import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { bootstrapWorkspace } from "../src/application/use-cases/bootstrap-workspace.js";
import { NodeFileSystem } from "../src/infrastructure/fs/node-file-system.js";
import { YamlConfigLoader } from "../src/infrastructure/config/yaml-config-loader.js";
import { WorkspaceRuntimeLoader } from "../src/application/services/workspace-runtime-loader.js";

describe("bootstrapWorkspace", () => {
  it("creates .airic structure and loads role spec", async () => {
    const fs = new NodeFileSystem();
    const workspaceRoot = await mkdtemp(join(tmpdir(), "airic-test-"));

    await bootstrapWorkspace(fs, workspaceRoot);

    const configPath = join(workspaceRoot, ".airic", "config.yml");
    const roleSpecPath = join(
      workspaceRoot,
      ".airic",
      "specs",
      "roles",
      "thinking-partner.md",
    );

    await expect(readFile(configPath, "utf8")).resolves.toContain(
      "core.thinking-partner",
    );
    await expect(readFile(roleSpecPath, "utf8")).resolves.toContain(
      "Thinking Partner",
    );

    const configLoader = new YamlConfigLoader(fs);
    const runtimeLoader = new WorkspaceRuntimeLoader(fs, configLoader);
    const runtime = await runtimeLoader.load(workspaceRoot);

    const role = runtime.specRegistry.require("core.thinking-partner");
    expect(role.docType).toBe("core.role");
    expect(runtime.baseInstruction).toContain("Airic Kernel");
  });

  it("does not overwrite existing role specs", async () => {
    const fs = new NodeFileSystem();
    const workspaceRoot = await mkdtemp(join(tmpdir(), "airic-test-"));

    await bootstrapWorkspace(fs, workspaceRoot);

    const roleSpecPath = join(
      workspaceRoot,
      ".airic",
      "specs",
      "roles",
      "thinking-partner.md",
    );

    await writeFile(roleSpecPath, "CUSTOM ROLE SPEC", "utf8");
    await bootstrapWorkspace(fs, workspaceRoot);

    await expect(readFile(roleSpecPath, "utf8")).resolves.toBe(
      "CUSTOM ROLE SPEC",
    );
  });
});
