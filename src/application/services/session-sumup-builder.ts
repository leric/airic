import type { DigFrame } from "../../domain/session/turn-node.js";

/** Renders the `/sumup` prompts from core-pack templates loaded into
 *  `WorkspaceRuntime.prompts` (`.airic/packs/core/prompts/`).
 *  Behavior spec: docs/kernel-tdd.md §11. */

export function renderSumupSystemPrompt(template: string): string {
  return template.trim();
}

export function renderSumupPrompt(
  template: string,
  frame: DigFrame,
  baseTurn: { title: string; assistantMessage: string } | undefined,
): string {
  const topic = frame.topic ? `"${frame.topic}"` : "the detail exploration";
  const resumePoint = baseTurn?.title ?? "the previous discussion";
  const baseContext = baseTurn?.assistantMessage
    ? `Context at the resume point (last assistant message):\n${baseTurn.assistantMessage}`
    : "";

  const filled = fill(template, {
    resumePoint,
    topic,
    baseContext,
  });

  // Collapse the blank line left behind when baseContext is empty.
  return filled.replace(/\n{3,}/g, "\n\n").trim();
}

function fill(template: string, values: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    result = result.split(`{{${key}}}`).join(value);
  }
  return result;
}
