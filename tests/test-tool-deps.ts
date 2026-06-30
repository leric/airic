import { SpecRegistry } from "../src/application/services/spec-registry.js";
import type { SessionStorePort } from "../src/application/ports/session-store-port.js";
import type { SummarizationPort } from "../src/application/ports/summarization-port.js";
import { HistoryChangeStore } from "../src/application/services/history-change-store.js";
import { createHistoryTools } from "../src/infrastructure/tools/history/create-history-tools.js";
import type { AiricToolDefinition } from "../src/domain/tool/tool.js";

export function createTestSpecRegistry(): SpecRegistry {
  return new SpecRegistry();
}

export function createNoopSessionStore(): SessionStorePort {
  return {
    async get() {
      return null;
    },
    async save() {},
    async delete() {},
  };
}

const testSummarizationPort: SummarizationPort = {
  async summarize({ sourceText, prompt }) {
    return `[test:${prompt}] ${sourceText.slice(0, 20)}`;
  },
};

export function createTestHistoryTools(): AiricToolDefinition[] {
  return createHistoryTools({
    sessionStore: createNoopSessionStore(),
    summarizationPort: testSummarizationPort,
    historyChangeStore: new HistoryChangeStore(),
    historyAuditLog: {
      append: async () => {},
    } as never,
    getLlmConfig: () => ({
      provider: "openai",
      model: "gpt-4.1",
      temperature: 0,
      maxTokens: 1000,
      thinkingLevel: "off",
      maxToolRounds: 8,
    }),
  });
}
