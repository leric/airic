import { describe, expect, it } from "vitest";
import { RuntimeContextBuilder } from "../src/application/services/runtime-context-builder.js";
import type { SpecDocument } from "../src/domain/spec/spec-document.js";

describe("RuntimeContextBuilder", () => {
  it("combines base instruction, role spec, and current document", () => {
    const builder = new RuntimeContextBuilder();
    const roleSpec: SpecDocument = {
      path: "role.md",
      frontmatter: { id: "core.thinking-partner", doc_type: "core.role" },
      id: "core.thinking-partner",
      docType: "core.role",
      body: "# Role\n\nAsk thoughtful questions.",
    };

    const prompt = builder.buildSystemPrompt({
      baseInstruction: "You are Airic.",
      roleSpec,
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
  });

  it("refreshes system prompt via buildAgentContext", async () => {
    const builder = new RuntimeContextBuilder();
    const roleSpec: SpecDocument = {
      path: "role.md",
      frontmatter: { id: "core.thinking-partner", doc_type: "core.role" },
      id: "core.thinking-partner",
      docType: "core.role",
      body: "Role body",
    };

    let currentPath = "a.md";
    const context = builder.buildAgentContext(
      {
        baseInstruction: "Base",
        roleSpec,
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
