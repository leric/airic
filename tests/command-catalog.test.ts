import { describe, expect, it } from "vitest";
import { listAvailableSlashCommands } from "../src/application/services/command-catalog.js";
import { SpecRegistry } from "../src/application/services/spec-registry.js";
import { parseSessionCommand } from "../src/domain/session/session-command.js";
import { toAcpAvailableCommands } from "../src/interfaces/acp/acp-command-catalog.js";
import type { SpecDocument } from "../src/domain/spec/spec-document.js";

function makeProcessSpec(id: string): SpecDocument {
  return {
    path: `${id}.md`,
    frontmatter: {
      id,
      doc_type: "core.process",
      title: id,
      summary: `Summary for ${id}`,
      activation: "suggested",
    },
    id,
    docType: "core.process",
    body: `# ${id}`,
  };
}

describe("listAvailableSlashCommands", () => {
  it("returns kernel slash commands with process ids in the process hint", () => {
    const registry = new SpecRegistry();
    registry.register(makeProcessSpec("core.task-decomposition"));
    registry.register(makeProcessSpec("core.precedent-extraction"));

    const commands = listAvailableSlashCommands(registry);

    expect(commands.map((command) => command.name)).toEqual([
      "tree",
      "process",
    ]);

    const processCommand = commands.find((command) => command.name === "process");
    expect(processCommand?.inputHint).toContain("core.task-decomposition");
    expect(processCommand?.inputHint).toContain("core.precedent-extraction");
  });

  it("lists only commands that parseSessionCommand recognizes", () => {
    const registry = new SpecRegistry();
    const commands = listAvailableSlashCommands(registry);

    for (const command of commands) {
      const parsed = parseSessionCommand(`/${command.name}`);
      expect(parsed.kind, `/${command.name} is not parsed as a slash command`).not.toBe(
        "message",
      );
    }
  });
});

describe("toAcpAvailableCommands", () => {
  it("maps kernel commands to ACP available command shape", () => {
    const acpCommands = toAcpAvailableCommands([
      {
        name: "tree",
        description: "Show the current session turn tree.",
      },
      {
        name: "process",
        description: "Manage Airic process workflows.",
        inputHint: "list | start <process-id>",
      },
    ]);

    expect(acpCommands).toEqual([
      {
        name: "tree",
        description: "Show the current session turn tree.",
        input: null,
      },
      {
        name: "process",
        description: "Manage Airic process workflows.",
        input: { hint: "list | start <process-id>" },
      },
    ]);
  });
});
