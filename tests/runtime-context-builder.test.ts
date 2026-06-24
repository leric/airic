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
