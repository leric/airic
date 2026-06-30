import type { AiricConfig } from "../../../application/ports/config-loader-port.js";
import type { SessionStorePort } from "../../../application/ports/session-store-port.js";
import type { SummarizationPort } from "../../../application/ports/summarization-port.js";
import type { HistoryAuditLog } from "../../../application/services/history-audit-log.js";
import type { HistoryChangeStore } from "../../../application/services/history-change-store.js";
import { ensureSessionTree } from "../../../domain/session/ensure-session-tree.js";

export type HistoryToolDeps = {
  sessionStore: SessionStorePort;
  summarizationPort: SummarizationPort;
  historyChangeStore: HistoryChangeStore;
  historyAuditLog: HistoryAuditLog;
  getLlmConfig: () => AiricConfig["llm"];
};

export async function loadSessionForHistoryTool(
  deps: Pick<HistoryToolDeps, "sessionStore">,
  sessionId: string,
) {
  const session = await deps.sessionStore.get(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  ensureSessionTree(session);
  return session;
}
