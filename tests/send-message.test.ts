import { describe, expect, it } from "vitest";
import type {
  AgentRuntimePort,
  AgentTurnInput,
  AgentTurnResult,
} from "../src/application/ports/agent-runtime-port.js";
import { SendMessageUseCase } from "../src/application/use-cases/send-message.js";
import type { KernelToolRegistryPort } from "../src/application/services/kernel-tool-registry.js";
import { RuntimeContextBuilder } from "../src/application/services/runtime-context-builder.js";
import { createSession } from "../src/domain/session/session.js";
import type { SessionStorePort } from "../src/application/ports/session-store-port.js";
import type { SpecDocument } from "../src/domain/spec/spec-document.js";

class FakeAgentRuntime implements AgentRuntimePort {
  abortCalls: string[] = [];

  async runTurn(input: AgentTurnInput): Promise<AgentTurnResult> {
    await input.onEvent({ type: "text_delta", text: "Hello" });
    await input.onEvent({ type: "run_end", assistantText: "Hello" });

    const turnMessages = [
      {
        role: "user" as const,
        content: input.userMessage,
        timestamp: new Date().toISOString(),
      },
      {
        role: "assistant" as const,
        content: "Hello",
        timestamp: new Date().toISOString(),
      },
    ];

    return {
      assistantText: "Hello",
      turnMessages,
    };
  }

  abort(sessionId: string): void {
    this.abortCalls.push(sessionId);
  }
}

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

function createUseCase(
  sessionStore: MemorySessionStore,
  agentRuntime: FakeAgentRuntime,
) {
  const modeSpec: SpecDocument = {
    path: "mode.md",
    frontmatter: {},
    id: "core.thinking-partner",
    docType: "core.mode",
    body: "Mode",
  };

  return new SendMessageUseCase({
    sessionStore,
    agentRuntime,
    runtime: {
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
      specRegistry: {
        require: () => modeSpec,
        get: () => undefined,
        listByDocType: () => [],
      } as never,
    },
    fs: {} as never,
    kernelTools: {
      definitions: () => [],
      handler: () => undefined,
      presentToolCall: (name) => ({ title: name, kind: "other", rawInput: {} }),
    } satisfies KernelToolRegistryPort,
    contextBuilder: new RuntimeContextBuilder(),
  });
}

describe("SendMessageUseCase", () => {
  it("delegates to AgentRuntimePort and persists turn tree", async () => {
    const sessionStore = new MemorySessionStore();
    const agentRuntime = new FakeAgentRuntime();
    const session = createSession("s1", "/tmp/workspace", "core.thinking-partner");
    await sessionStore.save(session);

    const events: string[] = [];
    const useCase = createUseCase(sessionStore, agentRuntime);

    const response = await useCase.execute({
      sessionId: "s1",
      userMessage: "Hi",
      onEvent: async (event) => {
        events.push(event.type);
      },
    });

    expect(response).toBe("Hello");
    expect(events).toContain("text_delta");
    expect(events).toContain("run_end");

    const saved = await sessionStore.get("s1");
    expect(Object.keys(saved?.turns ?? {})).toHaveLength(1);
    expect(saved?.currentTurnId).toBeDefined();
    const turn = saved?.currentTurnId ? saved.turns[saved.currentTurnId] : undefined;
    expect(turn?.userMessage).toBe("Hi");
    expect(turn?.assistantMessage).toBe("Hello");
  });
});
