import { describe, expect, it } from "vitest";
import { createSession } from "../src/domain/session/session.js";
import { parseSessionCommand } from "../src/domain/session/session-command.js";
import { generateTurnTitle } from "../src/domain/session/turn-node.js";
import {
  appendTurn,
  cursorPath,
  projectCursorPath,
  renderTree,
} from "../src/domain/session/turn-tree.js";

describe("parseSessionCommand", () => {
  it("parses tree", () => {
    expect(parseSessionCommand("/tree")).toEqual({ kind: "tree" });
  });

  it("treats other input as normal messages", () => {
    expect(parseSessionCommand("hello")).toEqual({ kind: "message", text: "hello" });
  });

  it("parses process commands", () => {
    expect(parseSessionCommand("/process list")).toEqual({
      kind: "process",
      action: "list",
    });
    expect(parseSessionCommand("/process status")).toEqual({
      kind: "process",
      action: "status",
    });
    expect(parseSessionCommand("/process complete")).toEqual({
      kind: "process",
      action: "complete",
    });
    expect(parseSessionCommand("/process cancel no longer needed")).toEqual({
      kind: "process",
      action: "cancel",
      reason: "no longer needed",
    });
    expect(parseSessionCommand("/process start core.process.task-decomposition")).toEqual({
      kind: "process",
      action: "start",
      processId: "core.process.task-decomposition",
    });
    expect(parseSessionCommand("/process core.process.task-decomposition")).toEqual({
      kind: "process",
      action: "start",
      processId: "core.process.task-decomposition",
    });
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
    const session = createSession("s1", "/tmp", "core.mode.thinking-partner");

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

  it("renders a tree with current marker", () => {
    const session = createSession("s1", "/tmp", "core.mode.thinking-partner");
    appendTurn(session, {
      userMessage: "Root",
      assistantMessage: "Root reply",
    });

    const tree = renderTree(session);
    expect(tree).toContain("Root");
    expect(tree).toContain("← current");
  });
});
