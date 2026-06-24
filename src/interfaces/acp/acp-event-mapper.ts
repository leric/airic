import * as acp from "@agentclientprotocol/sdk";
import type { AgentRuntimeEvent } from "../../application/ports/agent-runtime-port.js";

export async function mapAgentRuntimeEventToAcp(
  sessionId: string,
  event: AgentRuntimeEvent,
  cx: acp.AgentContext,
): Promise<void> {
  switch (event.type) {
    case "text_delta":
      await cx.notify(acp.methods.client.session.update, {
        sessionId,
        update: {
          sessionUpdate: "agent_message_chunk",
          content: {
            type: "text",
            text: event.text,
          },
        },
      });
      return;
    case "tool_call_start":
      await cx.notify(acp.methods.client.session.update, {
        sessionId,
        update: {
          sessionUpdate: "tool_call",
          toolCallId: event.toolCallId,
          title: event.title,
          kind: event.kind,
          status: "in_progress",
          rawInput: event.rawInput,
          locations: event.locations,
        },
      });
      return;
    case "tool_call_end":
      await cx.notify(acp.methods.client.session.update, {
        sessionId,
        update: {
          sessionUpdate: "tool_call_update",
          toolCallId: event.toolCallId,
          status: event.status,
          content: event.acpContent?.length
            ? event.acpContent
            : event.content
              ? [
                  {
                    type: "content",
                    content: {
                      type: "text",
                      text: event.content,
                    },
                  },
                ]
              : undefined,
          rawOutput: event.rawOutput,
        },
      });
      return;
    case "run_end":
      return;
  }
}
