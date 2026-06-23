export type PendingEdit = {
  id: string;
  sessionId: string;
  path: string;
  originalContent: string;
  newContent: string;
  diff: string;
  createdAt: string;
};

export type EditLogEntry = {
  timestamp: string;
  sessionId: string;
  editId: string;
  path: string;
  diff: string;
};
