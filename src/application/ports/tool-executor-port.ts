import type { Session } from "../../domain/session/session.js";
import type { AiricToolResult } from "../../domain/tool/tool-result.js";
import type {
  EditPermissionGate,
  HistoryPermissionGate,
} from "./agent-runtime-port.js";

export type ToolExecutionEvents = {
  onProposeEdit?: EditPermissionGate;
  onProposeHistoryChange?: HistoryPermissionGate;
};

export type ToolExecutionContext = {
  toolCallId: string;
  permissionGate?: EditPermissionGate;
  historyPermissionGate?: HistoryPermissionGate;
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
