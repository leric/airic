import { describe, expect, it } from "vitest";
import { RuntimeContextBuilder } from "../src/application/services/runtime-context-builder.js";
import type { SpecDocument } from "../src/domain/spec/spec-document.js";

describe("RuntimeContextBuilder", () => {
  it("combines base instruction, role spec, and chat history", () => {
    const builder = new RuntimeContextBuilder();
    const roleSpec: SpecDocument = {
      path: "role.md",
      frontmatter: { id: "core.thinking-partner", doc_type: "core.role" },
      id: "core.thinking-partner",
      docType: "core.role",
      body: "# Role\n\nAsk thoughtful questions.",
    };

    const messages = builder.build({
      baseInstruction: "You are Airic.",
      roleSpec,
      chatHistory: [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there." },
        { role: "user", content: "Help me think." },
      ],
    });

    expect(messages[0]?.role).toBe("system");
    expect(messages[0]?.content).toContain("You are Airic.");
    expect(messages[0]?.content).toContain("Ask thoughtful questions.");
    expect(messages).toHaveLength(4);
    expect(messages[3]?.content).toBe("Help me think.");
  });
});
