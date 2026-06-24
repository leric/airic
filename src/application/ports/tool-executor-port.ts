import type { PendingEdit } from "../../domain/tool/pending-edit.js";
import type { Session } from "../../domain/session/session.js";
import type { AiricToolResult } from "../../domain/tool/tool-result.js";
import type { EditPermissionGate } from "./agent-runtime-port.js";

export type ToolExecutionEvents = {
  onProposeEdit?: (
    edit: PendingEdit,
    toolCallId: string,
  ) => Promise<"allow" | "reject">;
};

export type ToolExecutionContext = {
  toolCallId: string;
  permissionGate?: EditPermissionGate;
  signal?: AbortSignal;
  onUpdate?: (update: AiricToolResult) => void;
};

export interface ToolExecutorPort {
  execute(
    session: Session,
    toolName: string,
    args: Record<string, unknown>,
    ctx: ToolExecutionContext,
    events?: ToolExecutionEvents,
  ): Promise<AiricToolResult>;
}
