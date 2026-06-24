import { join } from "node:path";
import { load as loadYaml } from "js-yaml";
import type { AiricConfig, ConfigLoaderPort } from "../../application/ports/config-loader-port.js";
import type { FileSystemPort } from "../../application/ports/file-system-port.js";

export class YamlConfigLoader implements ConfigLoaderPort {
  constructor(private readonly fs: FileSystemPort) {}

  async load(workspaceRoot: string): Promise<AiricConfig> {
    const configPath = join(workspaceRoot, ".airic", "config.yml");
    const raw = await this.fs.readText(configPath);
    const parsed = loadYaml(raw) as Record<string, unknown>;

    return {
      defaultMode: readString(parsed.default_mode, "core.thinking-partner"),
      llm: {
        provider: readString(readObject(parsed.llm).provider, "openai"),
        model: readString(readObject(parsed.llm).model, "gpt-4o"),
        baseUrl: readOptionalString(readObject(parsed.llm).base_url),
        apiKey: readOptionalString(readObject(parsed.llm).api_key),
        temperature: readNumber(readObject(parsed.llm).temperature, 0.7),
        maxTokens: readNumber(readObject(parsed.llm).max_tokens, 4096),
        thinkingLevel: readThinkingLevel(readObject(parsed.llm).thinking_level),
      },
      packs: {
        core: readString(readObject(parsed.packs).core, ".airic/packs/core"),
      },
      specPaths: {
        modes: readString(
          readObject(parsed.spec_paths).modes,
          ".airic/specs/modes",
        ),
        documentTypes: readString(
          readObject(parsed.spec_paths).document_types,
          ".airic/specs/document-types",
        ),
        processes: readString(
          readObject(parsed.spec_paths).processes,
          ".airic/specs/processes",
        ),
      },
      editing: {
        requireConfirmation: readBoolean(
          readObject(parsed.editing).require_confirmation,
          true,
        ),
      },
      cache: {
        enabled: readBoolean(readObject(parsed.cache).enabled, true),
      },
    };
  }
}

function readObject(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readThinkingLevel(
  value: unknown,
): import("../../application/ports/config-loader-port.js").ThinkingLevel {
  if (
    value === "off" ||
    value === "minimal" ||
    value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "xhigh"
  ) {
    return value;
  }
  return "off";
}

export function resolveWorkspacePath(
  workspaceRoot: string,
  relativePath: string,
): string {
  if (relativePath.startsWith("/")) {
    return relativePath;
  }
  return join(workspaceRoot, relativePath).replace(/\\/g, "/");
}
