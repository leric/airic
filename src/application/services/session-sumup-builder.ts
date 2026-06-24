import type { DigFrame } from "../../domain/session/turn-node.js";

/** Prompt policy for `/sumup`. Behavior spec: docs/session-tree.md §10–11. */
export function buildSumupSystemPrompt(): string {
  return [
    "You summarize temporary dig-in conversations for Airic Kernel session history.",
    "Produce a concise return summary that helps the user resume the main discussion.",
    "Follow the requested structure exactly.",
  ].join("\n");
}

export function buildSumupPrompt(
  frame: DigFrame,
  baseTurn: { title: string; assistantMessage: string } | undefined,
): string {
  const topic = frame.topic ? `"${frame.topic}"` : "the detail exploration";
  const resumePoint = baseTurn?.title ?? "the previous discussion";
  const baseContext = baseTurn?.assistantMessage
    ? `\nContext at the resume point (last assistant message):\n${baseTurn.assistantMessage}`
    : "";

  return [
    "Summarize the dig-in conversation above and prepare to return to the main discussion.",
    "",
    `Resume point: ${resumePoint}`,
    `Dig-in topic: ${topic}`,
    baseContext,
    "",
    "Produce a return summary with exactly this structure:",
    "",
    "Returned to: <resume point>",
    "",
    "Before dig-in:",
    "<what we were discussing at the resume point>",
    "",
    "Dig-in summary:",
    "<what the side discussion found>",
    "",
    "Brought back:",
    "<conclusions or constraints that should affect the resumed discussion>",
    "",
    "Continuing:",
    "<where the discussion should continue from>",
  ].join("\n");
}
