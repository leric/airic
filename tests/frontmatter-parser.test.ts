import { describe, expect, it } from "vitest";
import { parseMarkdownFrontmatter } from "../src/infrastructure/markdown/frontmatter-parser.js";

describe("parseMarkdownFrontmatter", () => {
  it("parses yaml frontmatter and body", () => {
    const raw = `---
id: core.thinking-partner
doc_type: core.mode
title: Thinking Partner
---

# Thinking Partner

Help the user think.
`;

    const parsed = parseMarkdownFrontmatter(raw);

    expect(parsed.frontmatter.id).toBe("core.thinking-partner");
    expect(parsed.frontmatter.doc_type).toBe("core.mode");
    expect(parsed.body.trim()).toContain("# Thinking Partner");
  });
});
