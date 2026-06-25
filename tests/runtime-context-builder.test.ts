import { describe, expect, it } from "vitest";
import { RuntimeContextBuilder } from "../src/application/services/runtime-context-builder.js";
import type { SpecDocument } from "../src/domain/spec/spec-document.js";

describe("RuntimeContextBuilder", () => {
  it("combines base instruction, mode spec, and current document", () => {
    const builder = new RuntimeContextBuilder();
    const modeSpec: SpecDocument = {
      path: "mode.md",
      frontmatter: { id: "core.thinking-partner", doc_type: "core.mode" },
      id: "core.thinking-partner",
      docType: "core.mode",
      body: "# Mode\n\nAsk thoughtful questions.",
    };

    const prompt = builder.buildSystemPrompt({
      baseInstruction: "You are Airic.",
      modeSpec,
      processIndex: "",
      currentDocument: {
        relativePath: "notes/example.md",
        content: "# Example",
        docType: "core.note",
      },
    });

    expect(prompt).toContain("You are Airic.");
    expect(prompt).toContain("Ask thoughtful questions.");
    expect(prompt).toContain("notes/example.md");
    expect(prompt).toContain("# Example");
    expect(prompt).toContain("## Active Mode");
  });

  it("includes process index when no process is active", () => {
    const builder = new RuntimeContextBuilder();
    const modeSpec: SpecDocument = {
      path: "mode.md",
      frontmatter: { id: "core.thinking-partner", doc_type: "core.mode" },
      id: "core.thinking-partner",
      docType: "core.mode",
      body: "Mode body",
    };

    const prompt = builder.buildSystemPrompt({
      baseInstruction: "Base",
      modeSpec,
      processIndex:
        "- core.task-decomposition: Turn clarified intent into executable task documents.",
    });

    expect(prompt).toContain("## Available Processes");
    expect(prompt).toContain("core.task-decomposition");
  });

  it("includes full active process spec instead of index", () => {
    const builder = new RuntimeContextBuilder();
    const modeSpec: SpecDocument = {
      path: "mode.md",
      frontmatter: { id: "core.thinking-partner", doc_type: "core.mode" },
      id: "core.thinking-partner",
      docType: "core.mode",
      body: "Mode body",
    };
    const activeProcessSpec: SpecDocument = {
      path: "task-decomposition.md",
      frontmatter: {
        id: "core.task-decomposition",
        doc_type: "core.process",
      },
      id: "core.task-decomposition",
      docType: "core.process",
      body: "Follow the task decomposition method.",
    };

    const prompt = builder.buildSystemPrompt({
      baseInstruction: "Base",
      modeSpec,
      processIndex: "- core.task-decomposition: summary",
      activeProcessSpec,
    });

    expect(prompt).toContain("## Active Process");
    expect(prompt).toContain("Follow the task decomposition method.");
    expect(prompt).not.toContain("## Available Processes");
  });

  it("refreshes system prompt via buildAgentContext", async () => {
    const builder = new RuntimeContextBuilder();
    const modeSpec: SpecDocument = {
      path: "mode.md",
      frontmatter: { id: "core.thinking-partner", doc_type: "core.mode" },
      id: "core.thinking-partner",
      docType: "core.mode",
      body: "Mode body",
    };

    let currentPath = "a.md";
    const context = builder.buildAgentContext(
      {
        baseInstruction: "Base",
        modeSpec,
        processIndex: "",
        currentDocument: {
          relativePath: currentPath,
          content: "A",
        },
      },
      async () => ({
        relativePath: "b.md",
        content: "B",
      }),
    );

    expect(context.systemPrompt).toContain("a.md");
    const refreshed = await context.refreshSystemPrompt();
    expect(refreshed).toContain("b.md");
    expect(refreshed).not.toContain("a.md");
  });
});
