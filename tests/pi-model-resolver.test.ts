import { describe, expect, it } from "vitest";
import { PiModelResolver } from "../src/infrastructure/agent/pi-model-resolver.js";

describe("PiModelResolver", () => {
  it("resolves openai models from config", () => {
    const resolver = new PiModelResolver();
    const model = resolver.resolve({
      provider: "openai",
      model: "gpt-4o",
      temperature: 0.7,
      maxTokens: 4096,
      thinkingLevel: "off",
    });

    expect(model.provider).toBe("openai");
    expect(model.id).toBe("gpt-4o");
  });

  it("rejects unknown providers", () => {
    const resolver = new PiModelResolver();
    expect(() =>
      resolver.resolve({
        provider: "unknown-provider",
        model: "gpt-4o",
        temperature: 0.7,
        maxTokens: 4096,
        thinkingLevel: "off",
      }),
    ).toThrow(/Unsupported LLM provider/);
  });
});
