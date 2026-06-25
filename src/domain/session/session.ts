import type { DigFrame, TurnNode } from "./turn-node.js";

export type ProcessInstanceStatus = "active" | "completed" | "cancelled";

export type ProcessInstance = {
  id: string;
  processId: string;
  status: ProcessInstanceStatus;
  startedBy: "user" | "agent";
  startedAt: string;
  completedAt?: string;
  cancelledAt?: string;
  reason?: string;
  inputSummary?: string;
  outputSummary?: string;
  state?: Record<string, unknown>;
};

export type Session = {
  id: string;
  workspaceRoot: string;
  modeId?: string;
  currentDocument?: string;
  activeProcessInstanceId?: string;
  processInstances: Record<string, ProcessInstance>;

  rootTurnId?: string;
  currentTurnId?: string;
  turns: Record<string, TurnNode>;
  digStack: DigFrame[];

  createdAt: string;
  updatedAt: string;
};

export function createSession(
  id: string,
  workspaceRoot: string,
  modeId: string,
): Session {
  const now = new Date().toISOString();
  return {
    id,
    workspaceRoot,
    modeId,
    processInstances: {},
    turns: {},
    digStack: [],
    createdAt: now,
    updatedAt: now,
  };
}
