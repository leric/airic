import type { TranscriptMessage } from "../agent/transcript.js";

export type ChatRole = "user" | "assistant" | "system";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type Session = {
  id: string;
  workspaceRoot: string;
  roleId?: string;
  currentDocument?: string;
  activeProcess?: string;
  transcript: TranscriptMessage[];
  messages: ChatMessage[];
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
    transcript: [],
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}
