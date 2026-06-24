import type {
  ToolPolicyCheckInput,
  ToolPolicyDecision,
} from "../../domain/tool/tool-policy.js";

export interface ToolPolicyPort {
  check(call: ToolPolicyCheckInput): Promise<ToolPolicyDecision>;
}

export class AllowAllToolPolicy implements ToolPolicyPort {
  async check(): Promise<ToolPolicyDecision> {
    return { kind: "allow" };
  }
}
