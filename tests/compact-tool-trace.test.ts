import { describe, expect, it } from "vitest";
import {
  compactToolTraceForProjection,
  deriveToolResultStatus,
} from "../src/domain/session/compact-tool-trace.js";
import type { TranscriptMessage } from "../src/domain/agent/transcript.js";
import { toPiMessages } from "../src/infrastructure/agent/pi-transcript-mapper.js";

const describeCall = (name: string, args: Record<string, unknown>) => {
  if (name === "read") return `Read ${String(args.path ?? "file")}`;
  if (name === "write") return `Write ${String(args.path ?? "file")}`;
  if (name === "grep") return `Grep /${String(args.pattern ?? "")}/`;
  return name;
};

function sampleToolTrace(): TranscriptMessage[] {
  return [
    {
      role: "user",
      content: "Fix config",
      timestamp: "2026-01-01T00:00:00.000Z",
    },
    {
      role: "assistant",
      content: "I'll read it first.",
      timestamp: "2026-01-01T00:00:01.000Z",
      toolCalls: [
        {
          id: "call-read",
          name: "read",
          arguments: JSON.stringify({ path: "config.yml" }),
        },
      ],
    },
    {
      role: "tool_result",
      toolCallId: "call-read",
      content: "foo: bar\n".repeat(500),
      timestamp: "2026-01-01T00:00:02.000Z",
    },
    {
      role: "assistant",
      content: "Now I'll write the fix.",
      timestamp: "2026-01-01T00:00:03.000Z",
      toolCalls: [
        {
          id: "call-write",
          name: "write",
          arguments: JSON.stringify({ path: "config.yml", content: "fixed" }),
        },
      ],
    },
    {
      role: "tool_result",
      toolCallId: "call-write",
      content: "Change rejected by user for config.yml.",
      timestamp: "2026-01-01T00:00:04.000Z",
    },
    {
      role: "assistant",
      content: "Done.",
      timestamp: "2026-01-01T00:00:05.000Z",
    },
  ];
}

describe("deriveToolResultStatus", () => {
  it("classifies error, rejection, and success", () => {
    expect(
      deriveToolResultStatus({
        role: "tool_result",
        toolCallId: "1",
        content: "boom",
        isError: true,
        timestamp: "t",
      }),
    ).toBe("failed");

    expect(
      deriveToolResultStatus({
        role: "tool_result",
        toolCallId: "1",
        content: "Change rejected by user",
        timestamp: "t",
      }),
    ).toBe("rejected");

    expect(
      deriveToolResultStatus({
        role: "tool_result",
        toolCallId: "1",
        content: "ok",
        timestamp: "t",
      }),
    ).toBe("ok");
  });
});

describe("compactToolTraceForProjection", () => {
  it("preserves message count, order, and assistant toolCalls", () => {
    const input = sampleToolTrace();
    const output = compactToolTraceForProjection(input, { describeCall });

    expect(output.map((message) => message.role)).toEqual(
      input.map((message) => message.role),
    );
    expect(output[1]).toMatchObject({
      role: "assistant",
      content: "I'll read it first.",
      toolCalls: input[1]?.toolCalls,
    });
  });

  it("replaces tool_result content with title and status", () => {
    const output = compactToolTraceForProjection(sampleToolTrace(), {
      describeCall,
    });

    expect(output[2]).toMatchObject({
      role: "tool_result",
      toolCallId: "call-read",
      content: "Read config.yml — ok",
    });
    expect(output[4]).toMatchObject({
      role: "tool_result",
      toolCallId: "call-write",
      content: "Write config.yml — rejected",
    });
  });

  it("batches parallel tool results with distinct compact lines", () => {
    const trace: TranscriptMessage[] = [
      {
        role: "assistant",
        content: "",
        timestamp: "t1",
        toolCalls: [
          {
            id: "a",
            name: "read",
            arguments: JSON.stringify({ path: "a.md" }),
          },
          {
            id: "b",
            name: "read",
            arguments: JSON.stringify({ path: "b.md" }),
          },
        ],
      },
      {
        role: "tool_result",
        toolCallId: "a",
        content: "A",
        timestamp: "t2",
      },
      {
        role: "tool_result",
        toolCallId: "b",
        content: "B",
        timestamp: "t3",
      },
    ];

    const output = compactToolTraceForProjection(trace, { describeCall });
    expect(output[1]?.content).toBe("Read a.md — ok");
    expect(output[2]?.content).toBe("Read b.md — ok");
  });

  it("maps to Pi messages without error", () => {
    const output = compactToolTraceForProjection(sampleToolTrace(), {
      describeCall,
    });
    const piMessages = toPiMessages(output, {
      provider: "openai",
      model: "gpt-4",
      api: "openai-responses",
    });
    expect(piMessages.length).toBeGreaterThan(0);
  });
});
