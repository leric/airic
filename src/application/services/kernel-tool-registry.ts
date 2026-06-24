/**
 * Pi Agent Core tool bridge.
 *
 * Named `KernelToolRegistry` (not `AiricToolRegistry` from docs/tools-plan.md) because
 * it adapts Airic tool definitions into Pi Agent Core's AgentTool shape. Tool definitions
 * come from ToolRegistryPort — the single source of truth. See architecture-map.md.
 */
import type { Session } from "../../domain/session/session.js";
import type { AiricToolResult } from "../../domain/tool/tool-result.js";
import type { ToolCallPresentation } from "../../domain/tool/tool-presentation.js";
import type { EditPermissionGate } from "../ports/agent-runtime-port.js";
import type { ToolRegistryPort } from "../ports/tool-registry-port.js";
import type { ToolExecutorPort } from "../ports/tool-executor-port.js";

export type KernelToolHandler = (
  session: Session,
  args: Record<string, unknown>,
  ctx: {
    toolCallId: string;
    permissionGate?: EditPermissionGate;
    signal?: AbortSignal;
    onUpdate?: (update: AiricToolResult) => void;
  },
) => Promise<AiricToolResult>;

export type KernelToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  kind: "read" | "edit" | "search" | "execute" | "other";
  sequential?: boolean;
};

export type { ToolCallPresentation };

export interface KernelToolRegistryPort {
  definitions(): KernelToolDefinition[];
  handler(name: string): KernelToolHandler | undefined;
  presentToolCall(
    name: string,
    args: Record<string, unknown>,
  ): ToolCallPresentation;
}

export class KernelToolRegistry implements KernelToolRegistryPort {
  constructor(
    private readonly executor: ToolExecutorPort,
    private readonly registry: ToolRegistryPort,
  ) {}

  definitions(): KernelToolDefinition[] {
    return this.registry.list().map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
      kind: kernelKind(tool.kind),
      sequential: tool.sequential,
    }));
  }

  handler(name: string): KernelToolHandler | undefined {
    if (!this.registry.get(name)) {
      return undefined;
    }

    return async (session, args, ctx) => {
      return this.executor.execute(session, name, args, ctx, {
        onProposeEdit: ctx.permissionGate
          ? async (edit, toolCallId) => ctx.permissionGate!(edit, toolCallId)
          : undefined,
      });
    };
  }

  presentToolCall(
    name: string,
    args: Record<string, unknown>,
  ): ToolCallPresentation {
    const tool = this.registry.get(name);
    if (tool?.present) {
      return tool.present(args);
    }

    return {
      title: name,
      kind: tool ? kernelKind(tool.kind) : "other",
      rawInput: args,
    };
  }
}

function kernelKind(
  kind: string,
): "read" | "edit" | "search" | "execute" | "other" {
  if (kind === "read" || kind === "edit" || kind === "search" || kind === "execute") {
    return kind;
  }
  return "other";
}
