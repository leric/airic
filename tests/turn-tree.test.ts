import { describe, expect, it } from "vitest";
import { ensureSessionTree } from "../src/domain/session/ensure-session-tree.js";
import { createSession } from "../src/domain/session/session.js";
import { parseSessionCommand } from "../src/domain/session/session-command.js";
import { generateTurnTitle, type TurnNode } from "../src/domain/session/turn-node.js";
import {
  appendSummaryNode,
  appendTurn,
  cursorPath,
  projectCursorPath,
  renderTree,
} from "../src/domain/session/turn-tree.js";

function buildLinearSession(turns: Array<{ user: string; assistant: string }>) {
  const session = createSession("s1", "/tmp", "core.mode.thinking-partner");
  for (const turn of turns) {
    appendTurn(session, {
      userMessage: turn.user,
      assistantMessage: turn.assistant,
    });
  }
  return session;
}

function nodeIds(session: ReturnType<typeof buildLinearSession>): string[] {
  return cursorPath(session).map((node) => node.id);
}

describe("parseSessionCommand", () => {
  it("parses tree", () => {
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
    const session = buildLinearSession([
      { user: "Hello", assistant: "Hi there" },
      { user: "Next", assistant: "Sure" },
    ]);

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
    const session = buildLinearSession([{ user: "Root", assistant: "Root reply" }]);
    const tree = renderTree(session);
    expect(tree).toContain("Root");
    expect(tree).toContain("← current");
  });
});

describe("ensureSessionTree migration", () => {
  it("migrates legacy kind normal to message", () => {
    const session = createSession("s1", "/tmp", "core.mode.thinking-partner");
    session.turns = {
      n1: {
        id: "n1",
        userMessage: "Hi",
        assistantMessage: "Hello",
        title: "Hi",
        kind: "normal" as unknown as TurnNode["kind"],
        createdAt: "2020-01-01T00:00:00.000Z",
      },
    };
    session.rootTurnId = "n1";

    ensureSessionTree(session);

    expect(session.turns.n1!.kind).toBe("message");
    expect(session.turns.n1!.labels).toEqual([]);
    expect(session.currentTurnId).toBe("n1");
  });
});

describe("projectCursorPath with summary replacement", () => {
  it("projects without summaries unchanged", () => {
    const session = buildLinearSession([
      { user: "A", assistant: "B" },
      { user: "C", assistant: "D" },
    ]);
    expect(projectCursorPath(session).map((m) => m.content)).toEqual([
      "A",
      "B",
      "C",
      "D",
    ]);
  });

  it("replaces a contiguous path range with summary producedText", () => {
    const session = buildLinearSession([
      { user: "A", assistant: "B" },
      { user: "C", assistant: "D" },
      { user: "E", assistant: "F" },
    ]);
    const path = cursorPath(session);
    const fromId = path[0]!.id;
    const toId = path[1]!.id;

    appendSummaryNode(session, {
      parentId: toId,
      summaryMeta: {
        source: { fromId, toId },
        replacesRange: true,
        prompt: "compress",
        producedText: "AB-CD summary",
      },
    });

    expect(projectCursorPath(session).map((m) => m.content)).toEqual([
      "AB-CD summary",
      "E",
      "F",
    ]);
  });

  it("supports nested replacement (outer first)", () => {
    const session = buildLinearSession([
      { user: "T1", assistant: "R1" },
      { user: "T2", assistant: "R2" },
      { user: "T3", assistant: "R3" },
      { user: "T4", assistant: "R4" },
    ]);
    const path = cursorPath(session);

    appendSummaryNode(session, {
      parentId: path[1]!.id,
      summaryMeta: {
        source: { fromId: path[0]!.id, toId: path[1]!.id },
        replacesRange: true,
        prompt: "inner",
        producedText: "inner summary",
      },
    });

    appendSummaryNode(session, {
      parentId: path[2]!.id,
      summaryMeta: {
        source: { fromId: path[0]!.id, toId: path[2]!.id },
        replacesRange: true,
        prompt: "outer",
        producedText: "outer summary",
      },
    });

    expect(projectCursorPath(session).map((m) => m.content)).toEqual([
      "outer summary",
      "T4",
      "R4",
    ]);
  });

  it("ignores side-branch summaries that do not replace range", () => {
    const session = buildLinearSession([
      { user: "Main", assistant: "Reply" },
    ]);
    const rootId = nodeIds(session)[0]!;

    appendTurn(session, {
      userMessage: "Side",
      assistantMessage: "Side reply",
      parentId: rootId,
    });
    session.currentTurnId = session.turns[rootId]!.id;

    const sidePath = Object.values(session.turns).find(
      (n) => n.userMessage === "Side",
    )!;

    appendSummaryNode(session, {
      parentId: rootId,
      summaryMeta: {
        source: { fromId: rootId, toId: sidePath.id },
        replacesRange: false,
        prompt: "graft",
        producedText: "grafted conclusion",
      },
    });

    session.currentTurnId = rootId;
    expect(projectCursorPath(session).map((m) => m.content)).toEqual([
      "Main",
      "Reply",
    ]);
  });

  it("does not apply replacement when cursor is inside the replaced range", () => {
    const session = buildLinearSession([
      { user: "A", assistant: "B" },
      { user: "C", assistant: "D" },
      { user: "E", assistant: "F" },
    ]);
    const path = cursorPath(session);

    appendSummaryNode(session, {
      parentId: path[1]!.id,
      summaryMeta: {
        source: { fromId: path[0]!.id, toId: path[2]!.id },
        replacesRange: true,
        prompt: "compress",
        producedText: "should not apply",
      },
    });

    session.currentTurnId = path[1]!.id;
    expect(projectCursorPath(session).map((m) => m.content)).toEqual([
      "A",
      "B",
      "C",
      "D",
    ]);
  });

  it("ignores replacement when source range is not fully on cursor path", () => {
    const session = buildLinearSession([
      { user: "Root", assistant: "Root reply" },
    ]);
    const rootId = nodeIds(session)[0]!;

    appendTurn(session, {
      userMessage: "Branch A",
      assistantMessage: "A reply",
      parentId: rootId,
    });
    const branchB = appendTurn(session, {
      userMessage: "Branch B",
      assistantMessage: "B reply",
      parentId: rootId,
    });

    const branchA = Object.values(session.turns).find(
      (n) => n.userMessage === "Branch A",
    )!;

    appendSummaryNode(session, {
      parentId: rootId,
      summaryMeta: {
        source: { fromId: rootId, toId: branchA.id },
        replacesRange: true,
        prompt: "compress branch",
        producedText: "branch summary",
      },
    });

    session.currentTurnId = branchB.id;

    expect(projectCursorPath(session).map((m) => m.content)).toEqual([
      "Root",
      "Root reply",
      "Branch B",
      "B reply",
    ]);
  });
});
