import { join } from "node:path";
import type { SessionStorePort } from "../../application/ports/session-store-port.js";
import type { FileSystemPort } from "../../application/ports/file-system-port.js";
import type { Session } from "../../domain/session/session.js";

export class JsonSessionStore implements SessionStorePort {
  constructor(
    private readonly fs: FileSystemPort,
    private readonly workspaceRoot: string,
  ) {}

  private sessionPath(sessionId: string): string {
    return join(this.workspaceRoot, ".airic", "sessions", `${sessionId}.json`);
  }

  async get(sessionId: string): Promise<Session | null> {
    const path = this.sessionPath(sessionId);
    const exists = await this.fs.exists(path);
    if (!exists) {
      return null;
    }

    const raw = await this.fs.readText(path);
    const session = JSON.parse(raw) as Session;
    // Turn-tree defaults on load. In-memory sibling: ensureSessionTree() in domain/session/.
    if (!session.turns) {
      session.turns = {};
    }
    if (!session.processInstances) {
      session.processInstances = {};
    }
    return session;
  }

  async save(session: Session): Promise<void> {
    const path = this.sessionPath(session.id);
    await this.fs.writeText(path, JSON.stringify(session, null, 2));
  }

  async delete(sessionId: string): Promise<void> {
    const path = this.sessionPath(sessionId);
    const exists = await this.fs.exists(path);
    if (!exists) {
      return;
    }
    await this.fs.writeText(path, "");
  }
}

export class SessionStoreFactory {
  constructor(private readonly fs: FileSystemPort) {}

  forWorkspace(workspaceRoot: string): JsonSessionStore {
    return new JsonSessionStore(this.fs, workspaceRoot);
  }
}
