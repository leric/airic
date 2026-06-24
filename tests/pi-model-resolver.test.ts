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

  it("resolves openai-compatible models with baseUrl", () => {
    const resolver = new PiModelResolver();
    const model = resolver.resolve({
      provider: "openai-compatible",
      model: "llama-3.1-8b",
      baseUrl: "http://localhost:11434/v1",
      apiKey: "sk-test",
      temperature: 0.7,
      maxTokens: 4096,
      thinkingLevel: "off",
    });

    expect(model.provider).toContain("openai-compatible");
    expect(model.id).toBe("llama-3.1-8b");
    expect(model.baseUrl).toBe("http://localhost:11434/v1");
    expect(model.api).toBe("openai-completions");
  });

  it("resolves openai-compatible without apiKey", () => {
    const resolver = new PiModelResolver();
    const model = resolver.resolve({
      provider: "openai-compatible",
      model: "qwen2.5:7b",
      baseUrl: "http://localhost:11434/v1",
      temperature: 0.5,
      maxTokens: 8192,
      thinkingLevel: "off",
    });

    expect(model.id).toBe("qwen2.5:7b");
    expect(model.baseUrl).toBe("http://localhost:11434/v1");
    expect(model.api).toBe("openai-completions");
  });

  it("throws when openai-compatible has no baseUrl", () => {
    const resolver = new PiModelResolver();
    expect(() =>
      resolver.resolve({
        provider: "openai-compatible",
        model: "llama-3.1-8b",
        temperature: 0.7,
        maxTokens: 4096,
        thinkingLevel: "off",
      }),
    ).toThrow(/base_url/);
  });
});
