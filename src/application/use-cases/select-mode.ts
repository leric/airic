import type { SessionStorePort } from "../ports/session-store-port.js";
import type { WorkspaceRuntime } from "../services/workspace-runtime-loader.js";

export type SelectModeInput = {
  sessionId: string;
  modeId: string;
};

export type SelectModeDeps = {
  sessionStore: SessionStorePort;
  runtime: WorkspaceRuntime;
};

export class SelectModeUseCase {
  constructor(private readonly deps: SelectModeDeps) {}

  async execute(input: SelectModeInput): Promise<void> {
    this.deps.runtime.specRegistry.require(input.modeId);

    const session = await this.deps.sessionStore.get(input.sessionId);
    if (!session) {
      throw new Error(`Session not found: ${input.sessionId}`);
    }

    session.modeId = input.modeId;
    session.updatedAt = new Date().toISOString();
    await this.deps.sessionStore.save(session);
  }
}
