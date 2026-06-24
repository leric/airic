import { describe, expect, it } from "vitest";
import { listAvailableModes } from "../src/application/services/mode-catalog.js";
import { SpecRegistry } from "../src/application/services/spec-registry.js";
import type { SpecDocument } from "../src/domain/spec/spec-document.js";

function makeModeSpec(
  id: string,
  title: string,
  description?: string,
): SpecDocument {
  return {
    path: `${id}.md`,
    frontmatter: {
      id,
      doc_type: "core.mode",
      title,
      ...(description ? { description } : {}),
    },
    id,
    docType: "core.mode",
    body: `# ${title}`,
  };
}

describe("listAvailableModes", () => {
  it("returns concrete mode specs excluding the mode definition spec", () => {
    const registry = new SpecRegistry();
    registry.register(makeModeSpec("core.mode", "Mode Spec"));
    registry.register(makeModeSpec("core.thinking-partner", "Thinking Partner"));
    registry.register(
      makeModeSpec("founder.idea-stage", "Idea Stage", "Early exploration"),
    );

    const modes = listAvailableModes(registry);

    expect(modes).toEqual([
      {
        id: "core.thinking-partner",
        name: "Thinking Partner",
      },
      {
        id: "founder.idea-stage",
        name: "Idea Stage",
        description: "Early exploration",
      },
    ]);
  });
});
