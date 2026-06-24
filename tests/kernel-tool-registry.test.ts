import { describe, expect, it } from "vitest";
import { KernelToolRegistry } from "../src/application/services/kernel-tool-registry.js";
import { KERNEL_TOOL_NAMES, ALL_KERNEL_TOOL_NAMES } from "../src/domain/tool/tool-names.js";

describe("KernelToolRegistry", () => {
  it("exposes Pi-style kernel tool definitions", () => {
    const registry = new KernelToolRegistry({
      execute: async () => ({ content: [{ type: "text", text: "ok" }] }),
    } as never);

    const names = registry.definitions().map((tool) => tool.name);
    expect(names).toEqual(expect.arrayContaining(ALL_KERNEL_TOOL_NAMES));
    expect(names).toHaveLength(ALL_KERNEL_TOOL_NAMES.length);
  });

  it("marks edit and write as sequential", () => {
    const registry = new KernelToolRegistry({
      execute: async () => ({ content: [{ type: "text", text: "ok" }] }),
    } as never);

    const edit = registry.definitions().find((tool) => tool.name === KERNEL_TOOL_NAMES.EDIT);
    const write = registry.definitions().find((tool) => tool.name === KERNEL_TOOL_NAMES.WRITE);

    expect(edit?.sequential).toBe(true);
    expect(write?.sequential).toBe(true);
  });

  it("presents tool call metadata", () => {
    const registry = new KernelToolRegistry({
      execute: async () => ({ content: [{ type: "text", text: "ok" }] }),
    } as never);

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
});
