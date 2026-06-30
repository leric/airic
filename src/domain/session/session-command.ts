/** Parses user slash commands for SendMessageUseCase dispatch.
 *  Keep command names in sync with `application/services/command-catalog.ts`
 *  (ACP `available_commands_update` advertisement). Sync test: `tests/command-catalog.test.ts`. */
export type ProcessCommandAction =
  | "list"
  | "start"
  | "status"
  | "complete"
  | "cancel";

export type SessionCommand =
  | { kind: "message"; text: string }
  | { kind: "tree" }
  | { kind: "cursor"; anchorText: string }
  | { kind: "summarize"; prompt: string }
  | { kind: "mark"; name: string }
  | {
      kind: "process";
      action: ProcessCommandAction;
      processId?: string;
      reason?: string;
      outputSummary?: string;
    };

export function parseSessionCommand(text: string): SessionCommand {
  const trimmed = text.trim();

  if (trimmed === "/tree") {
    return { kind: "tree" };
  }

  if (trimmed.startsWith("/cursor")) {
    return {
      kind: "cursor",
      anchorText: trimmed.slice("/cursor".length).trim(),
    };
  }

  if (trimmed.startsWith("/summarize")) {
    const prompt = trimmed.slice("/summarize".length).trim();
    return { kind: "summarize", prompt };
  }

  if (trimmed.startsWith("/mark")) {
    const name = trimmed.slice("/mark".length).trim();
    return { kind: "mark", name };
  }

  if (trimmed.startsWith("/process")) {
    return parseProcessCommand(trimmed);
  }

  return { kind: "message", text };
}

function parseProcessCommand(text: string): SessionCommand {
  const rest = text.slice("/process".length).trim();

  if (rest.length === 0) {
    return { kind: "process", action: "list" };
  }

  if (rest === "list") {
    return { kind: "process", action: "list" };
  }

  if (rest === "status") {
    return { kind: "process", action: "status" };
  }

  if (rest === "complete") {
    return { kind: "process", action: "complete" };
  }

  if (rest.startsWith("cancel")) {
    const reason = rest.slice("cancel".length).trim();
    return {
      kind: "process",
      action: "cancel",
      reason: reason.length > 0 ? reason : "User cancelled.",
    };
  }

  if (rest.startsWith("start ")) {
    const processId = rest.slice("start ".length).trim();
    return { kind: "process", action: "start", processId };
  }

  return { kind: "process", action: "start", processId: rest };
}
