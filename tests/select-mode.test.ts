import { describe, expect, it } from "vitest";
import { SelectModeUseCase } from "../src/application/use-cases/select-mode.js";
import { SpecRegistry } from "../src/application/services/spec-registry.js";
import { createSession } from "../src/domain/session/session.js";
import type { SessionStorePort } from "../src/application/ports/session-store-port.js";
import type { SpecDocument } from "../src/domain/spec/spec-document.js";
import type { WorkspaceRuntime } from "../src/application/services/workspace-runtime-loader.js";

class MemorySessionStore implements SessionStorePort {
  private readonly sessions = new Map<string, ReturnType<typeof createSession>>();

  async get(sessionId: string) {
    return this.sessions.get(sessionId) ?? null;
  }

  async save(session: ReturnType<typeof createSession>) {
    this.sessions.set(session.id, session);
  }

  async delete(sessionId: string) {
    this.sessions.delete(sessionId);
  }
}

function createRuntime(specRegistry: SpecRegistry): WorkspaceRuntime {
  return {
    workspaceRoot: "/tmp/workspace",
    config: {
      defaultMode: "core.thinking-partner",
      llm: {
        provider: "openai",
        model: "gpt-4o",
        temperature: 0.7,
        maxTokens: 4096,
        thinkingLevel: "off",
      },
      packs: { core: ".airic/packs/core" },
      editing: { requireConfirmation: true },
      cache: { enabled: true },
    },
    baseInstruction: "Base",
    specRegistry,
  };
}

describe("SelectModeUseCase", () => {
  it("persists the selected mode on the session", async () => {
    const sessionStore = new MemorySessionStore();
    const specRegistry = new SpecRegistry();
    const modeSpec: SpecDocument = {
      path: "mode.md",
      frontmatter: { id: "core.thinking-partner", doc_type: "core.mode" },
      id: "core.thinking-partner",
      docType: "core.mode",
      body: "Mode body",
    };
    specRegistry.register(modeSpec);

    const session = createSession("s1", "/tmp/workspace", "core.thinking-partner");
    await sessionStore.save(session);

    const useCase = new SelectModeUseCase({
      sessionStore,
      runtime: createRuntime(specRegistry),
    });

    await useCase.execute({
      sessionId: "s1",
      modeId: "core.thinking-partner",
    });

    const saved = await sessionStore.get("s1");
    expect(saved?.modeId).toBe("core.thinking-partner");
  });

  it("rejects unknown mode ids", async () => {
    const sessionStore = new MemorySessionStore();
    const specRegistry = new SpecRegistry();
    const session = createSession("s1", "/tmp/workspace", "core.thinking-partner");
    await sessionStore.save(session);

    const useCase = new SelectModeUseCase({
      sessionStore,
      runtime: createRuntime(specRegistry),
    });

    await expect(
      useCase.execute({
        sessionId: "s1",
        modeId: "missing.mode",
      }),
    ).rejects.toThrow("Spec not found: missing.mode");
  });
});
