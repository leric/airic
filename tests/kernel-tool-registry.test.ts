import { describe, expect, it } from "vitest";
import { KernelToolRegistry } from "../src/application/services/kernel-tool-registry.js";
import { ToolExecutor } from "../src/application/services/tool-executor.js";
import { AiricToolRegistry } from "../src/application/services/airic-tool-registry.js";
import { KERNEL_TOOL_NAMES, ALL_KERNEL_TOOL_NAMES } from "../src/domain/tool/tool-names.js";
import { createDefaultToolRegistry } from "../src/infrastructure/tools/create-tool-registry.js";
import { NodeFileSystem } from "../src/infrastructure/fs/node-file-system.js";
import {
  createNoopSessionStore,
  createTestHistoryTools,
  createTestSpecRegistry,
} from "./test-tool-deps.js";

function createTestKernelRegistry() {
  const fs = new NodeFileSystem();
  const registry = createDefaultToolRegistry({
    fs,
    sessionStore: createNoopSessionStore(),
    specRegistry: createTestSpecRegistry(),
    historyTools: createTestHistoryTools(),
  });
  const executor = new ToolExecutor({
    registry,
    mutationCoordinator: {
      confirmAndApply: async (_session, _args, result) => result,
    } as never,
  });
  return new KernelToolRegistry(executor, registry);
}

describe("KernelToolRegistry", () => {
  it("exposes Pi-style kernel tool definitions from registry", () => {
    const registry = createTestKernelRegistry();

    const names = registry.definitions().map((tool) => tool.name);
    expect(names).toEqual(expect.arrayContaining(ALL_KERNEL_TOOL_NAMES));
    expect(names).toHaveLength(ALL_KERNEL_TOOL_NAMES.length);
  });

  it("marks edit and write as sequential", () => {
    const registry = createTestKernelRegistry();

    const edit = registry.definitions().find((tool) => tool.name === KERNEL_TOOL_NAMES.EDIT);
    const write = registry.definitions().find((tool) => tool.name === KERNEL_TOOL_NAMES.WRITE);

    expect(edit?.sequential).toBe(true);
    expect(write?.sequential).toBe(true);
  });

  it("presents tool call metadata from tool definition", () => {
    const registry = createTestKernelRegistry();

    const readPresentation = registry.presentToolCall(KERNEL_TOOL_NAMES.READ, {
      path: "README.md",
    });
    expect(readPresentation.kind).toBe("read");
    expect(readPresentation.title).toContain("README.md");

    const bashPresentation = registry.presentToolCall(KERNEL_TOOL_NAMES.BASH, {
      command: "npm test",
    });
    expect(bashPresentation.kind).toBe("execute");
    expect(bashPresentation.title).toContain("npm test");
  });

  it("AiricToolRegistry stores tools by name", () => {
    const fs = new NodeFileSystem();
    const registry = new AiricToolRegistry(
      createDefaultToolRegistry({
        fs,
        sessionStore: createNoopSessionStore(),
        specRegistry: createTestSpecRegistry(),
        historyTools: createTestHistoryTools(),
      }).list(),
    );

    expect(registry.get(KERNEL_TOOL_NAMES.READ)?.kind).toBe("read");
    expect(registry.get("unknown")).toBeUndefined();
  });
});
