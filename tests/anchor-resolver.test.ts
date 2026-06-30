import { describe, expect, it } from "vitest";
import { createSession } from "../src/domain/session/session.js";
import { appendTurn } from "../src/domain/session/turn-tree.js";
import { addLabel } from "../src/domain/session/turn-tree.js";
import {
  AnchorError,
  resolveAnchorOrThrow,
} from "../src/application/services/anchor-resolver.js";

function buildForkSession() {
  const session = createSession("s1", "/tmp", "core.mode.thinking-partner");
  appendTurn(session, { userMessage: "Root", assistantMessage: "Root reply" });
  const rootId = session.rootTurnId!;

  const branchA = appendTurn(session, {
    userMessage: "Branch A1",
    assistantMessage: "A1 reply",
    parentId: rootId,
  });
  appendTurn(session, {
    userMessage: "Branch A2",
    assistantMessage: "A2 reply",
    parentId: branchA.id,
  });

  const branchB = appendTurn(session, {
    userMessage: "Branch B1",
    assistantMessage: "B1 reply",
    parentId: rootId,
  });

  session.currentTurnId = branchB.id;
  return { session, rootId, branchA, branchB };
}

describe("resolveAnchorOrThrow", () => {
  it("resolves cursor, root, and parent", () => {
    const { session, rootId, branchB } = buildForkSession();

    expect(resolveAnchorOrThrow(session, "cursor").id).toBe(branchB.id);
    expect(resolveAnchorOrThrow(session, "root").id).toBe(rootId);
    expect(resolveAnchorOrThrow(session, "parent").id).toBe(rootId);
  });

  it("resolves nearest-fork at root when cursor is on a branch", () => {
    const { session, rootId } = buildForkSession();
    expect(resolveAnchorOrThrow(session, "nearest-fork").id).toBe(rootId);
  });

  it("resolves recent by user turn count from cursor", () => {
    const { session, branchB } = buildForkSession();
    expect(resolveAnchorOrThrow(session, { recent: 1 }).id).toBe(branchB.id);
    expect(resolveAnchorOrThrow(session, { recent: 2 }).id).toBe(
      session.rootTurnId,
    );
  });

  it("resolves olderThan as boundary before recent N turns", () => {
    const session = createSession("s1", "/tmp", "core.mode.thinking-partner");
    for (let i = 1; i <= 5; i += 1) {
      appendTurn(session, {
        userMessage: `Turn ${i}`,
        assistantMessage: `Reply ${i}`,
      });
    }

    const path = [
      session.rootTurnId,
      ...Object.values(session.turns)
        .filter((n) => n.id !== session.rootTurnId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((n) => n.id),
    ];

    expect(resolveAnchorOrThrow(session, { olderThan: 2 }).id).toBe(
      path[path.length - 3]!,
    );
  });

  it("resolves label uniquely", () => {
    const { session, rootId } = buildForkSession();
    addLabel(session, rootId, "mainline");
    expect(resolveAnchorOrThrow(session, { label: "mainline" }).id).toBe(rootId);
  });

  it("throws on ambiguous label", () => {
    const { session, rootId, branchB } = buildForkSession();
    addLabel(session, rootId, "dup");
    addLabel(session, branchB.id, "dup");

    expect(() => resolveAnchorOrThrow(session, { label: "dup" })).toThrow(
      AnchorError,
    );
  });

  it("resolves nodeId by prefix", () => {
    const { session, branchB } = buildForkSession();
    expect(
      resolveAnchorOrThrow(session, { nodeId: branchB.id.slice(0, 8) }).id,
    ).toBe(branchB.id);
  });

  it("throws when recent is out of range", () => {
    const { session } = buildForkSession();
    expect(() => resolveAnchorOrThrow(session, { recent: 99 })).toThrow(
      AnchorError,
    );
  });
});
