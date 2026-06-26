import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { YamlConfigLoader } from "../src/infrastructure/config/yaml-config-loader.js";
import { NodeFileSystem } from "../src/infrastructure/fs/node-file-system.js";

async function writeConfig(contents: string): Promise<string> {
  const workspaceRoot = await mkdtemp(join(tmpdir(), "airic-cfg-test-"));
  await mkdir(join(workspaceRoot, ".airic"), { recursive: true });
  await writeFile(join(workspaceRoot, ".airic", "config.yml"), contents, "utf8");
  return workspaceRoot;
}

describe("YamlConfigLoader llm.maxToolRounds", () => {
  it("defaults maxToolRounds to 100 when not set", async () => {
    const workspaceRoot = await writeConfig(
      [
        "default_mode: core.mode.thinking-partner",
        "llm:",
        "  provider: openai",
        "  model: gpt-4o",
        "",
      ].join("\n"),
    );

    const loader = new YamlConfigLoader(new NodeFileSystem());
    const config = await loader.load(workspaceRoot);

    expect(config.llm.maxToolRounds).toBe(100);
  });

  it("respects max_tool_rounds override from yaml", async () => {
    const workspaceRoot = await writeConfig(
      [
        "default_mode: core.mode.thinking-partner",
        "llm:",
        "  provider: openai",
        "  model: gpt-4o",
        "  max_tool_rounds: 25",
        "",
      ].join("\n"),
    );

    const loader = new YamlConfigLoader(new NodeFileSystem());
    const config = await loader.load(workspaceRoot);

    expect(config.llm.maxToolRounds).toBe(25);
  });

  it("falls back to default when max_tool_rounds is invalid", async () => {
    const workspaceRoot = await writeConfig(
      [
        "default_mode: core.mode.thinking-partner",
        "llm:",
        "  provider: openai",
        "  model: gpt-4o",
        "  max_tool_rounds: not-a-number",
        "",
      ].join("\n"),
    );

    const loader = new YamlConfigLoader(new NodeFileSystem());
    const config = await loader.load(workspaceRoot);

    expect(config.llm.maxToolRounds).toBe(100);
  });
});
