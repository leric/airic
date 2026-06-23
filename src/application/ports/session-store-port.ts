import type { Session } from "../../domain/session/session.js";

export interface SessionStorePort {
  get(sessionId: string): Promise<Session | null>;
  save(session: Session): Promise<void>;
  delete(sessionId: string): Promise<void>;
}
