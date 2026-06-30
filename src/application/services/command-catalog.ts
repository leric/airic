import type { SpecRegistry } from "./spec-registry.js";
import { listProcesses } from "./process-catalog.js";

/** Kernel slash commands advertised to ACP clients (Zed autocomplete).
 *  Keep command names in sync with `domain/session/session-command.ts` (parse + dispatch).
 *  ACP mapping: `interfaces/acp/acp-command-catalog.ts`. Sync test: `tests/command-catalog.test.ts`. */
export type KernelSlashCommand = {
  name: string;
  description: string;
  inputHint?: string;
};

export function listAvailableSlashCommands(
  specRegistry: SpecRegistry,
): KernelSlashCommand[] {
  const processHint = buildProcessInputHint(specRegistry);

  return [
    {
      name: "tree",
      description: "Show the current session turn tree outline.",
    },
    {
      name: "cursor",
      description: "Move the session cursor to an anchor.",
      inputHint: "parent | root | nearest-fork | label:<name> | <node-id-prefix>",
    },
    {
      name: "summarize",
      description: "Summarize the current side branch or path segment.",
      inputHint: "<prompt>",
    },
    {
      name: "mark",
      description: "Label the current cursor node for later anchor references.",
      inputHint: "<name>",
    },
    {
      name: "process",
      description: "Manage Airic process workflows.",
      inputHint: processHint,
    },
  ];
}

function buildProcessInputHint(specRegistry: SpecRegistry): string {
  const processes = listProcesses(specRegistry);
  const processIds =
    processes.length > 0
      ? processes.map((process) => process.id).join(", ")
      : "<process-id>";

  return `list | start ${processIds} | status | complete | cancel [reason]`;
}
