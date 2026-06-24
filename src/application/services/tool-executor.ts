import type { Session } from "../../domain/session/session.js";
import type { AiricToolContext } from "../../domain/tool/tool.js";
import {
  requiresDiffConfirmation,
  requiresPolicyCheck,
} from "../../domain/tool/tool.js";
import type { AiricToolResult } from "../../domain/tool/tool-result.js";
import type { ToolPolicyPort } from "../ports/tool-policy-port.js";
import { AllowAllToolPolicy } from "../ports/tool-policy-port.js";
import type { ToolRegistryPort } from "../ports/tool-registry-port.js";
import type {
  ToolExecutionEvents,
  ToolExecutionContext,
  ToolExecutorPort,
} from "../ports/tool-executor-port.js";
import type { MutationCoordinator } from "./mutation-coordinator.js";

export type ToolExecutorDeps = {
  registry: ToolRegistryPort;
  mutationCoordinator: MutationCoordinator;
  toolPolicy?: ToolPolicyPort;
};

export class ToolExecutor implements ToolExecutorPort {
  private readonly toolPolicy: ToolPolicyPort;

  constructor(private readonly deps: ToolExecutorDeps) {
    this.toolPolicy = deps.toolPolicy ?? new AllowAllToolPolicy();
  }

  async execute(
    session: Session,
    toolName: string,
    args: Record<string, unknown>,
    ctx: ToolExecutionContext,
    events?: ToolExecutionEvents,
  ): Promise<AiricToolResult> {
    const tool = this.deps.registry.get(toolName);
    if (!tool) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    if (requiresPolicyCheck(tool)) {
      const decision = await this.toolPolicy.check({
        toolName,
        kind: tool.kind,
        args,
        sessionId: session.id,
        cwd: session.workspaceRoot,
      });

      if (decision.kind === "deny") {
        throw new Error(decision.reason);
      }
    }

    const context: AiricToolContext = {
      cwd: session.workspaceRoot,
      sessionId: session.id,
    };

    let result = await tool.execute(
      args,
      context,
      ctx.signal,
      ctx.onUpdate
        ? (update) =>
            ctx.onUpdate!({
              content: update.content,
              details: update.details,
            })
        : undefined,
    );

    if (requiresDiffConfirmation(tool)) {
      result = await this.deps.mutationCoordinator.confirmAndApply(
        session,
        args,
        result,
        ctx,
        events,
      );
    }

    return result;
  }
}
