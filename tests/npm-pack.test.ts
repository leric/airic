import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { NodeFileSystem } from "../src/infrastructure/fs/node-file-system.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("npm pack", () => {
  it("ships bundled core pack without local workspace artifacts", async () => {
    const packLines = execSync("npm pack --silent", {
      cwd: repoRoot,
      encoding: "utf8",
    })
      .trim()
      .split("\n")
      .filter(Boolean);
    const tarballName = packLines[packLines.length - 1]!;
    const tarballPath = join(repoRoot, tarballName);

    const extractDir = await mkdtemp(join(tmpdir(), "airic-pack-"));
    const workspaceRoot = await mkdtemp(join(tmpdir(), "airic-ws-"));

    try {
      const listing = execSync(`tar -tzf "${tarballPath}"`, {
        encoding: "utf8",
      });

      expect(listing).toContain(
        "package/.airic/packs/core/mode/thinking-partner.md",
      );
      expect(listing).toContain("package/.airic/config.default.yml");
      expect(listing).not.toMatch(/package\/\.airic\/sessions\//);
      expect(listing).not.toMatch(/package\/\.airic\/logs\//);
      expect(listing).not.toContain("package/.airic/config.yml");

      execSync(`tar -xzf "${tarballPath}" -C "${extractDir}"`);
      const packageRoot = join(extractDir, "package");
      const bundledModeSpec = join(
        packageRoot,
        ".airic",
        "packs",
        "core",
        "mode",
        "thinking-partner.md",
      );
      expect(existsSync(bundledModeSpec)).toBe(true);

      const { bootstrapWorkspace } = await import(
        join(
          packageRoot,
          "dist/application/use-cases/bootstrap-workspace.js",
        )
      );

      const fs = new NodeFileSystem();
      await bootstrapWorkspace(fs, workspaceRoot);

      const configPath = join(workspaceRoot, ".airic", "config.yml");
      await expect(readFile(configPath, "utf8")).resolves.toContain(
        "core.mode.thinking-partner",
      );
    } finally {
      await rm(tarballPath, { force: true });
      await rm(extractDir, { recursive: true, force: true });
      await rm(workspaceRoot, { recursive: true, force: true });
    }
  });
});
