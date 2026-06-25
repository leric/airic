import type { AiricConfig } from "../../application/ports/config-loader-port.js";
import {
  createModels,
  createProvider,
  type Api,
  type Model,
  type MutableModels,
  type Provider,
  type SimpleStreamOptions,
} from "@earendil-works/pi-ai";
import { openAICompletionsApi } from "@earendil-works/pi-ai/api/openai-completions.lazy";
import { anthropicProvider } from "@earendil-works/pi-ai/providers/anthropic";
import { openaiProvider } from "@earendil-works/pi-ai/providers/openai";
import { openrouterProvider } from "@earendil-works/pi-ai/providers/openrouter";

type ProviderFactory = () => Provider;

const PROVIDER_FACTORIES: Record<string, ProviderFactory> = {
  openai: openaiProvider,
  anthropic: anthropicProvider,
  openrouter: openrouterProvider,
};

const PROVIDER_OPENAI_COMPATIBLE = "openai-compatible";

export class PiModelResolver {
  readonly models: MutableModels;

  constructor(models?: MutableModels) {
    this.models = models ?? createModels();
    for (const factory of new Set(Object.values(PROVIDER_FACTORIES))) {
      this.models.setProvider(factory());
    }
  }

  resolve(config: AiricConfig["llm"]): Model<Api> {
    if (config.provider === PROVIDER_OPENAI_COMPATIBLE) {
      return this.resolveOpenAICompatible(config);
    }

    const factory = PROVIDER_FACTORIES[config.provider];
    if (!factory) {
      throw new Error(
        `Unsupported LLM provider "${config.provider}". Supported: ${Object.keys(PROVIDER_FACTORIES).join(", ")}, or use "openai-compatible" for any OpenAI-compatible API (Ollama, vLLM, etc.)`,
      );
    }

    if (!this.models.getProvider(config.provider)) {
      this.models.setProvider(factory());
    }

    const model = this.models.getModel(config.provider, config.model);
    if (!model) {
      throw new Error(
        `Model "${config.model}" not found for provider "${config.provider}"`,
      );
    }

    return model;
  }

  private resolveOpenAICompatible(config: AiricConfig["llm"]): Model<Api> {
    const baseUrl = config.baseUrl;
    if (!baseUrl) {
      throw new Error(
        'OpenAI-compatible provider requires a "base_url" in the LLM config',
      );
    }

    // Derive a stable provider ID from the base URL so different endpoints
    // are isolated, and the same endpoint is reused across resolve calls.
    const providerId = `openai-compatible:${baseUrl}`;

    if (!this.models.getProvider(providerId)) {
      const provider = createProvider({
        id: providerId,
        name: `OpenAI-compatible (${baseUrl})`,
        baseUrl,
        auth: {
          apiKey: {
            name: "OpenAI-compatible API key",
            resolve: async () => {
              const apiKey = config.apiKey ?? process.env.OPENAI_API_KEY;
              return apiKey ? { auth: { apiKey } } : { auth: {} };
            },
          },
        },
        models: [
          {
            id: config.model,
            name: config.model,
            api: "openai-completions",
            provider: providerId,
            baseUrl,
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            maxTokens: config.maxTokens,
          },
        ],
        api: openAICompletionsApi(),
      });
      this.models.setProvider(provider);
    }

    const model = this.models.getModel(providerId, config.model);
    if (!model) {
      throw new Error(
        `Model "${config.model}" not found for provider "${providerId}"`,
      );
    }

    return model;
  }

  streamSimple(
    model: Model<Api>,
    context: Parameters<MutableModels["streamSimple"]>[1],
    options?: SimpleStreamOptions,
  ) {
    return this.models.streamSimple(model, context, options);
  }
}
