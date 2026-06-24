import { describe, expect, it } from "vitest";
import type {
  AgentRuntimePort,
  AgentTurnInput,
  AgentTurnResult,
} from "../src/application/ports/agent-runtime-port.js";
import { SendMessageUseCase } from "../src/application/use-cases/send-message.js";
import { KernelToolRegistry } from "../src/application/services/kernel-tool-registry.js";
import { RuntimeContextBuilder } from "../src/application/services/runtime-context-builder.js";
import { createSession } from "../src/domain/session/session.js";
import type { SessionStorePort } from "../src/application/ports/session-store-port.js";
import type { SpecDocument } from "../src/domain/spec/spec-document.js";

class FakeAgentRuntime implements AgentRuntimePort {
  abortCalls: string[] = [];

  async runTurn(input: AgentTurnInput): Promise<AgentTurnResult> {
    await input.onEvent({ type: "text_delta", text: "Hello" });
    await input.onEvent({ type: "run_end", assistantText: "Hello" });

    const transcript = [
      ...input.session.transcript,
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
      transcript,
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

describe("SendMessageUseCase", () => {
  it("delegates to AgentRuntimePort and persists transcript", async () => {
    const sessionStore = new MemorySessionStore();
    const agentRuntime = new FakeAgentRuntime();
    const session = createSession("s1", "/tmp/workspace", "core.thinking-partner");
    await sessionStore.save(session);

    const roleSpec: SpecDocument = {
      path: "role.md",
      frontmatter: {},
      id: "core.thinking-partner",
      docType: "core.role",
      body: "Role",
    };

    const events: string[] = [];
    const useCase = new SendMessageUseCase({
      sessionStore,
      agentRuntime,
      runtime: {
        workspaceRoot: "/tmp/workspace",
        config: {
          defaultRole: "core.thinking-partner",
          llm: {
            provider: "openai",
            model: "gpt-4o",
            temperature: 0.7,
            maxTokens: 4096,
            thinkingLevel: "off",
          },
          packs: { core: ".airic/packs/core" },
          specPaths: {
            roles: ".airic/specs/roles",
            documentTypes: ".airic/specs/document-types",
            processes: ".airic/specs/processes",
          },
          editing: { requireConfirmation: true },
          cache: { enabled: true },
        },
        baseInstruction: "Base",
        specRegistry: {
          require: () => roleSpec,
        } as never,
      },
      fs: {} as never,
      editStore: {} as never,
      editLog: {} as never,
      kernelTools: new KernelToolRegistry({ execute: async () => "ok" } as never),
      contextBuilder: new RuntimeContextBuilder(),
    });

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
    expect(saved?.transcript).toHaveLength(2);
    expect(saved?.messages).toEqual([
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hello" },
    ]);
  });
});
