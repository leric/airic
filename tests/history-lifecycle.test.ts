import { describe, expect, it } from "vitest";
import { createSession } from "../src/domain/session/session.js";
import { appendTurn } from "../src/domain/session/turn-tree.js";
import type { SummarizationPort } from "../src/application/ports/summarization-port.js";
import {
  applyHistoryChange,
  buildMarkProposal,
  buildSummarizeProposal,
  moveCursor,
} from "../src/application/services/history-lifecycle.js";

const fakeSummarization: SummarizationPort = {
  async summarize({ sourceText, prompt }) {
    return `[summary:${prompt}] ${sourceText.slice(0, 40)}…`;
  },
};

const llm = {
  provider: "openai" as const,
  model: "gpt-4.1",
  temperature: 0,
  maxTokens: 1000,
  thinkingLevel: "off" as const,
  maxToolRounds: 8,
};

function buildForkSession() {
  const session = createSession("s1", "/tmp", "core.mode.thinking-partner");
  appendTurn(session, { userMessage: "Root", assistantMessage: "Root reply" });
  const rootId = session.rootTurnId!;

  const branch = appendTurn(session, {
    userMessage: "Side detail",
    assistantMessage: "Side reply",
    parentId: rootId,
  });
  appendTurn(session, {
    userMessage: "Side follow-up",
    assistantMessage: "Follow reply",
    parentId: branch.id,
  });

  return session;
}

describe("history lifecycle", () => {
  it("moveCursor updates currentTurnId", () => {
    const session = buildForkSession();
    const rootId = session.rootTurnId!;
    moveCursor(session, "root");
    expect(session.currentTurnId).toBe(rootId);
  });

  it("buildSummarizeProposal defaults to side-branch fold", async () => {
    const session = buildForkSession();
    const proposal = await buildSummarizeProposal(
      session,
      { prompt: "fold side branch", moveCursor: true },
      fakeSummarization,
      llm,
    );

    expect(proposal.applyPayload.action).toBe("summarize");
    if (proposal.applyPayload.action === "summarize") {
      expect(proposal.applyPayload.summaryMeta.replacesRange).toBe(false);
    }
    expect(proposal.previewText).toContain("fold side branch");
  });

  it("buildSummarizeProposal compresses on-path range", async () => {
    const session = createSession("s1", "/tmp", "core.mode.thinking-partner");
    appendTurn(session, { userMessage: "A", assistantMessage: "B" });
    appendTurn(session, { userMessage: "C", assistantMessage: "D" });
    const path = [session.rootTurnId!, session.currentTurnId!];

    const proposal = await buildSummarizeProposal(
      session,
      {
        source: { from: { nodeId: path[0]! }, to: { recent: 1 } },
        prompt: "compress early",
      },
      fakeSummarization,
      llm,
    );

    if (proposal.applyPayload.action === "summarize") {
      expect(proposal.applyPayload.summaryMeta.replacesRange).toBe(true);
    }
  });

  it("rejects empty summarize prompt", async () => {
    const session = buildForkSession();
    await expect(
      buildSummarizeProposal(session, { prompt: "  " }, fakeSummarization, llm),
    ).rejects.toThrow(/prompt is required/);
  });

  it("buildMarkProposal and applyHistoryChange add label", () => {
    const session = buildForkSession();
    const proposal = buildMarkProposal(session, { name: "mainline" });
    applyHistoryChange(session, proposal.applyPayload);
    expect(session.turns[session.currentTurnId!]?.labels).toContain("mainline");
  });
});
