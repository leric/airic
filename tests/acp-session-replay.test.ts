import { describe, expect, it } from "vitest";
import { appendTurn } from "../src/domain/session/turn-tree.js";
import { createSession } from "../src/domain/session/session.js";
import { replaySessionHistory } from "../src/interfaces/acp/acp-session-replay.js";

describe("replaySessionHistory", () => {
  it("replays user and assistant messages for turns without tool traces", async () => {
    const session = createSession("s1", "/tmp", "core.mode.thinking-partner");
    appendTurn(session, {
      userMessage: "Hello",
      assistantMessage: "Hi there",
    });
    appendTurn(session, {
      userMessage: "Next question",
      assistantMessage: "Sure",
    });

    const updates: Array<{ sessionUpdate: string; text?: string }> = [];
    const cx = {
      notify: async (_method: unknown, params: { update: { sessionUpdate: string; content?: { text: string } } }) => {
        updates.push({
          sessionUpdate: params.update.sessionUpdate,
          text: params.update.content?.text,
        });
      },
    };

    await replaySessionHistory("s1", session, cx as never);

    expect(updates).toEqual([
      { sessionUpdate: "user_message_chunk", text: "Hello" },
      { sessionUpdate: "agent_message_chunk", text: "Hi there" },
      { sessionUpdate: "user_message_chunk", text: "Next question" },
      { sessionUpdate: "agent_message_chunk", text: "Sure" },
    ]);
  });

  it("replays tool calls from stored tool traces", async () => {
    const session = createSession("s1", "/tmp", "core.mode.thinking-partner");
    appendTurn(session, {
      userMessage: "Read file",
      assistantMessage: "Done reading.",
      toolTrace: [
        {
          role: "user",
          content: "Read file",
          timestamp: "2026-01-01T00:00:00.000Z",
        },
        {
          role: "assistant",
          content: "",
          timestamp: "2026-01-01T00:00:01.000Z",
          toolCalls: [
            {
              id: "call-1",
              name: "read",
              arguments: JSON.stringify({ path: "README.md" }),
            },
          ],
        },
        {
          role: "tool_result",
          toolCallId: "call-1",
          content: "# Airic",
          timestamp: "2026-01-01T00:00:02.000Z",
        },
        {
          role: "assistant",
          content: "Done reading.",
          timestamp: "2026-01-01T00:00:03.000Z",
        },
      ],
    });

    const updates: Array<{ sessionUpdate: string; toolCallId?: string }> = [];
    const cx = {
      notify: async (_method: unknown, params: { update: { sessionUpdate: string; toolCallId?: string } }) => {
        updates.push({
          sessionUpdate: params.update.sessionUpdate,
          toolCallId: params.update.toolCallId,
        });
      },
    };

    await replaySessionHistory("s1", session, cx as never);

    expect(updates.map((update) => update.sessionUpdate)).toEqual([
      "user_message_chunk",
      "tool_call",
      "tool_call_update",
      "agent_message_chunk",
    ]);
    expect(updates[1]?.toolCallId).toBe("call-1");
    expect(updates[2]?.toolCallId).toBe("call-1");
  });
});
