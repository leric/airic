import type { FileSystemPort } from "../../../application/ports/file-system-port.js";
import type { SessionStorePort } from "../../../application/ports/session-store-port.js";
import type { SpecRegistry } from "../../../application/services/spec-registry.js";
import { ensureSessionTree } from "../../../domain/session/ensure-session-tree.js";

export type DocumentToolDeps = {
  fs: FileSystemPort;
  sessionStore: SessionStorePort;
  specRegistry: SpecRegistry;
};

export async function loadSessionForDocumentTool(
  deps: DocumentToolDeps,
  sessionId: string,
) {
  const session = await deps.sessionStore.get(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  ensureSessionTree(session);
  return session;
}
