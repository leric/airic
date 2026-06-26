import * as acp from "@agentclientprotocol/sdk";
import type { TranscriptMessage } from "../../domain/agent/transcript.js";
import type { Session } from "../../domain/session/session.js";
import { cursorPath } from "../../domain/session/turn-tree.js";
import { mapToolKindForAcp } from "./acp-tool-event-mapper.js";

export async function replaySessionHistory(
  sessionId: string,
  session: Session,
  cx: acp.AgentContext,
): Promise<void> {
  for (const turn of cursorPath(session)) {
    await notifyUserMessage(sessionId, turn.userMessage, cx);

    if (turn.toolTrace?.length) {
      await replayToolTrace(sessionId, turn.toolTrace, cx);
    } else {
      await notifyAgentMessage(sessionId, turn.assistantMessage, cx);
    }
  }
}

async function replayToolTrace(
  sessionId: string,
  toolTrace: TranscriptMessage[],
  cx: acp.AgentContext,
): Promise<void> {
  for (const message of toolTrace) {
    if (message.role === "user") {
      continue;
    }

    if (message.role === "assistant") {
      if (message.content) {
        await notifyAgentMessage(sessionId, message.content, cx);
      }

      for (const toolCall of message.toolCalls ?? []) {
        await cx.notify(acp.methods.client.session.update, {
          sessionId,
          update: {
            sessionUpdate: "tool_call",
            toolCallId: toolCall.id,
            title: toolCall.name,
            kind: mapToolKindForAcp(toolCall.name),
            status: "completed",
            rawInput: safeParseJson(toolCall.arguments),
          },
        });
      }
      continue;
    }

    await cx.notify(acp.methods.client.session.update, {
      sessionId,
      update: {
        sessionUpdate: "tool_call_update",
        toolCallId: message.toolCallId,
        status: message.isError ? "failed" : "completed",
        content: message.content
          ? [
              {
                type: "content",
                content: {
                  type: "text",
                  text: message.content,
                },
              },
            ]
          : undefined,
      },
    });
  }
}

async function notifyUserMessage(
  sessionId: string,
  text: string,
  cx: acp.AgentContext,
): Promise<void> {
  await cx.notify(acp.methods.client.session.update, {
    sessionId,
    update: {
      sessionUpdate: "user_message_chunk",
      content: {
        type: "text",
        text,
      },
    },
  });
}

async function notifyAgentMessage(
  sessionId: string,
  text: string,
  cx: acp.AgentContext,
): Promise<void> {
  if (!text) {
    return;
  }

  await cx.notify(acp.methods.client.session.update, {
    sessionId,
    update: {
      sessionUpdate: "agent_message_chunk",
      content: {
        type: "text",
        text,
      },
    },
  });
}

function safeParseJson(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}
