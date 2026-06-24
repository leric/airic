import { describe, expect, it } from "vitest";
import { createSession } from "../src/domain/session/session.js";
import { parseSessionCommand } from "../src/domain/session/session-command.js";
import { generateTurnTitle } from "../src/domain/session/turn-node.js";
import {
  appendTurn,
  beginDig,
  createReturnSummaryTurn,
  cursorPath,
  popDigFrame,
  projectCursorPath,
  renderTree,
} from "../src/domain/session/turn-tree.js";

describe("parseSessionCommand", () => {
  it("parses digin with optional topic", () => {
    expect(parseSessionCommand("/digin ACP UI")).toEqual({
      kind: "digin",
      topic: "ACP UI",
    });
    expect(parseSessionCommand("/digin")).toEqual({ kind: "digin", topic: undefined });
  });

  it("parses sumup and tree", () => {
    expect(parseSessionCommand("/sumup")).toEqual({ kind: "sumup" });
    expect(parseSessionCommand("/tree")).toEqual({ kind: "tree" });
  });

  it("treats other input as normal messages", () => {
    expect(parseSessionCommand("hello")).toEqual({ kind: "message", text: "hello" });
  });
});

describe("generateTurnTitle", () => {
  it("uses the first non-empty line", () => {
    expect(generateTurnTitle("\n\nDesign session history\nmore")).toBe(
      "Design session history",
    );
  });
});

describe("turn tree operations", () => {
  it("appends turns along the cursor path", () => {
    const session = createSession("s1", "/tmp", "core.thinking-partner");

    appendTurn(session, {
      userMessage: "Hello",
      assistantMessage: "Hi there",
    });
    appendTurn(session, {
      userMessage: "Next",
      assistantMessage: "Sure",
    });

    expect(Object.keys(session.turns)).toHaveLength(2);
    expect(cursorPath(session)).toHaveLength(2);
    expect(projectCursorPath(session)).toEqual([
      expect.objectContaining({ role: "user", content: "Hello" }),
      expect.objectContaining({ role: "assistant", content: "Hi there" }),
      expect.objectContaining({ role: "user", content: "Next" }),
      expect.objectContaining({ role: "assistant", content: "Sure" }),
    ]);
  });

  it("tracks digression frames and return summaries", () => {
    const session = createSession("s1", "/tmp", "core.thinking-partner");

    appendTurn(session, {
      userMessage: "Main topic",
      assistantMessage: "Main reply",
    });

    const frame = beginDig(session, "detail");
    expect(frame?.baseTurnId).toBe(session.currentTurnId);

    appendTurn(session, {
      userMessage: "Dig question",
      assistantMessage: "Dig answer",
    });

    const summaryText = "Returned to: Main topic\nDig-in summary: found detail";
    createReturnSummaryTurn(session, frame!, summaryText);
    popDigFrame(session);

    expect(session.digStack).toHaveLength(0);
    expect(cursorPath(session)).toHaveLength(2);
    expect(cursorPath(session)[1]?.kind).toBe("returnSummary");
    expect(projectCursorPath(session)).toEqual([
      expect.objectContaining({ role: "user", content: "Main topic" }),
      expect.objectContaining({ role: "assistant", content: "Main reply" }),
      expect.objectContaining({ role: "user", content: "/sumup" }),
      expect.objectContaining({ role: "assistant", content: summaryText }),
    ]);
  });

  it("renders a tree with current marker", () => {
    const session = createSession("s1", "/tmp", "core.thinking-partner");
    appendTurn(session, {
      userMessage: "Root",
      assistantMessage: "Root reply",
    });

    const tree = renderTree(session);
    expect(tree).toContain("Root");
    expect(tree).toContain("← current");
  });
});
