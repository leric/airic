import type { DigFrame, TurnNode } from "./turn-node.js";

export type Session = {
  id: string;
  workspaceRoot: string;
  roleId?: string;
  currentDocument?: string;
  activeProcess?: string;

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
  roleId: string,
): Session {
  const now = new Date().toISOString();
  return {
    id,
    workspaceRoot,
    roleId,
    turns: {},
    digStack: [],
    createdAt: now,
    updatedAt: now,
  };
}
