import { describe, expect, it } from "vitest";
import { KernelToolRegistry } from "../src/application/services/kernel-tool-registry.js";
import { KERNEL_TOOL_NAMES } from "../src/domain/tool/tool-names.js";

describe("KernelToolRegistry", () => {
  it("exposes kernel tool definitions", () => {
    const registry = new KernelToolRegistry({
      execute: async () => "ok",
    } as never);

    const names = registry.definitions().map((tool) => tool.name);
    expect(names).toContain(KERNEL_TOOL_NAMES.LIST_FILES);
    expect(names).toContain(KERNEL_TOOL_NAMES.PROPOSE_EDIT);
  });

  it("marks propose_edit as sequential", () => {
    const registry = new KernelToolRegistry({
      execute: async () => "ok",
    } as never);

    const proposeEdit = registry
      .definitions()
      .find((tool) => tool.name === KERNEL_TOOL_NAMES.PROPOSE_EDIT);

    expect(proposeEdit?.sequential).toBe(true);
  });

  it("presents tool call metadata", () => {
    const registry = new KernelToolRegistry({
      execute: async () => "ok",
    } as never);

    const presentation = registry.presentToolCall(KERNEL_TOOL_NAMES.READ_FILE, {
      path: "README.md",
    });

    expect(presentation.kind).toBe("read");
    expect(presentation.title).toContain("README.md");
  });
});
