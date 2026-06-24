export type ToolPolicyCheckInput = {
  toolName: string;
  kind: import("./tool.js").AiricToolKind;
  args: Record<string, unknown>;
  sessionId: string;
  cwd: string;
};

export type ToolPolicyDecision =
  | { kind: "allow" }
  | { kind: "deny"; reason: string }
  | { kind: "request_permission"; reason: string };
