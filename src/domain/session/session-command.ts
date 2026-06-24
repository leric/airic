export type SessionCommand =
  | { kind: "message"; text: string }
  | { kind: "digin"; topic?: string }
  | { kind: "sumup" }
  | { kind: "tree" };

export function parseSessionCommand(text: string): SessionCommand {
  const trimmed = text.trim();

  if (trimmed === "/sumup") {
    return { kind: "sumup" };
  }

  if (trimmed === "/tree") {
    return { kind: "tree" };
  }

  if (trimmed.startsWith("/digin")) {
    const topic = trimmed.slice("/digin".length).trim();
    return { kind: "digin", topic: topic.length > 0 ? topic : undefined };
  }

  return { kind: "message", text };
}
