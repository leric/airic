import { describe, expect, it } from "vitest";
import {
  fromPiMessages,
  toPiMessages,
} from "../src/infrastructure/agent/pi-transcript-mapper.js";

describe("pi-transcript-mapper", () => {
  it("round-trips user and assistant messages", () => {
    const transcript = [
      {
        role: "user" as const,
        content: "Hello",
        timestamp: "2026-01-01T00:00:00.000Z",
      },
      {
        role: "assistant" as const,
        content: "Hi",
        timestamp: "2026-01-01T00:00:01.000Z",
      },
    ];

    const piMessages = toPiMessages(transcript, {
      provider: "openai",
      model: "gpt-4o",
      api: "openai-responses",
    });
    const restored = fromPiMessages(piMessages);

    expect(restored).toEqual(transcript);
  });

  it("preserves tool calls and tool results", () => {
    const transcript = [
      {
        role: "user" as const,
        content: "Read file",
        timestamp: "2026-01-01T00:00:00.000Z",
      },
      {
        role: "assistant" as const,
        content: "",
        timestamp: "2026-01-01T00:00:01.000Z",
        toolCalls: [
          {
            id: "call_1",
            name: "read_file",
            arguments: "{\"path\":\"README.md\"}",
          },
        ],
      },
      {
        role: "tool_result" as const,
        toolCallId: "call_1",
        content: "file contents",
        timestamp: "2026-01-01T00:00:02.000Z",
      },
    ];

    const piMessages = toPiMessages(transcript, {
      provider: "openai",
      model: "gpt-4o",
      api: "openai-responses",
    });
    const restored = fromPiMessages(piMessages);

    expect(restored[1]?.role).toBe("assistant");
    expect(restored[2]?.role).toBe("tool_result");
    if (restored[1]?.role === "assistant") {
      expect(restored[1].toolCalls?.[0]?.name).toBe("read_file");
    }
    if (restored[2]?.role === "tool_result") {
      expect(restored[2].content).toBe("file contents");
    }
  });
});
