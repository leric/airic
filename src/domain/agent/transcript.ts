export type ToolCallRecord = {
  id: string;
  name: string;
  arguments: string;
};

export type TranscriptMessage =
  | { role: "user"; content: string; timestamp: string }
  | {
      role: "assistant";
      content: string;
      timestamp: string;
      toolCalls?: ToolCallRecord[];
    }
  | {
      role: "tool_result";
      toolCallId: string;
      content: string;
      isError?: boolean;
      timestamp: string;
    };
