import type { AiricConfig } from "../../application/ports/config-loader-port.js";
import {
  createModels,
  type Api,
  type Model,
  type MutableModels,
  type Provider,
  type SimpleStreamOptions,
} from "@earendil-works/pi-ai";
import { anthropicProvider } from "@earendil-works/pi-ai/providers/anthropic";
import { openaiProvider } from "@earendil-works/pi-ai/providers/openai";
import { openrouterProvider } from "@earendil-works/pi-ai/providers/openrouter";

type ProviderFactory = () => Provider;

const PROVIDER_FACTORIES: Record<string, ProviderFactory> = {
  openai: openaiProvider,
  anthropic: anthropicProvider,
  openrouter: openrouterProvider,
};

export class PiModelResolver {
  readonly models: MutableModels;

  constructor(models?: MutableModels) {
    this.models = models ?? createModels();
    for (const factory of new Set(Object.values(PROVIDER_FACTORIES))) {
      this.models.setProvider(factory());
    }
  }

  resolve(config: AiricConfig["llm"]): Model<Api> {
    const factory = PROVIDER_FACTORIES[config.provider];
    if (!factory) {
      throw new Error(
        `Unsupported LLM provider "${config.provider}". Supported: ${Object.keys(PROVIDER_FACTORIES).join(", ")}`,
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

  streamSimple(
    model: Model<Api>,
    context: Parameters<MutableModels["streamSimple"]>[1],
    options?: SimpleStreamOptions,
  ) {
    return this.models.streamSimple(model, context, options);
  }
}
