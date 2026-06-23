import { describe, expect, it } from "vitest";
import { DiffService } from "../src/infrastructure/diff/diff-service.js";

describe("DiffService", () => {
  it("creates a unified diff between original and new content", () => {
    const diff = new DiffService().createPatch(
      "README.md",
      "hello\n",
      "hello\nworld\n",
    );

    expect(diff).toContain("README.md");
    expect(diff).toContain("+world");
  });
});
