import { describe, expect, it } from "vitest";
import {
  buildProcessIndexText,
  formatProcessListForUser,
  listProcesses,
} from "../src/application/services/process-catalog.js";
import { SpecRegistry } from "../src/application/services/spec-registry.js";
import type { SpecDocument } from "../src/domain/spec/spec-document.js";

function makeProcessSpec(
  id: string,
  overrides: Partial<SpecDocument["frontmatter"]> = {},
): SpecDocument {
  return {
    path: `${id}.md`,
    frontmatter: {
      id,
      doc_type: "core.process",
      title: id,
      summary: `Summary for ${id}`,
      triggers: ["trigger one", "trigger two"],
      activation: "suggested",
      ...overrides,
    },
    id,
    docType: "core.process",
    body: `# ${id}`,
  };
}

describe("listProcesses", () => {
  it("returns concrete process specs excluding the process definition spec", () => {
    const registry = new SpecRegistry();
    registry.register(makeProcessSpec("core.document-type.process"));
    registry.register(makeProcessSpec("core.process.task-decomposition"));
    registry.register(makeProcessSpec("core.process.precedent-extraction"));

    const processes = listProcesses(registry);

    expect(processes).toHaveLength(2);
    expect(processes.map((process) => process.id)).toEqual([
      "core.process.task-decomposition",
      "core.process.precedent-extraction",
    ]);
    expect(processes[0]?.activation).toBe("suggested");
  });
});

describe("buildProcessIndexText", () => {
  it("formats compact process index for prompt injection", () => {
    const text = buildProcessIndexText([
      {
        id: "core.process.task-decomposition",
        title: "Task Decomposition",
        summary: "Turn clarified intent into executable task documents.",
        triggers: ["user wants tasks", "stable objective needs delegation"],
        activation: "suggested",
        path: "task-decomposition.md",
      },
    ]);

    expect(text).toContain("core.process.task-decomposition");
    expect(text).toContain("Turn clarified intent into executable task documents.");
    expect(text).toContain("Triggers:");
    expect(text).toContain("Activation: suggested.");
  });
});

describe("formatProcessListForUser", () => {
  it("formats process list for /process list output", () => {
    const text = formatProcessListForUser([
      {
        id: "core.process.task-decomposition",
        title: "Task Decomposition",
        summary: "Turn clarified intent into executable task documents.",
        triggers: [],
        activation: "suggested",
        path: "task-decomposition.md",
      },
    ]);

    expect(text).toContain("core.process.task-decomposition");
    expect(text).toContain("Activation: suggested.");
  });
});
