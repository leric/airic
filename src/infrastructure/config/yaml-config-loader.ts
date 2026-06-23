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
      defaultRole: readString(parsed.default_role, "core.thinking-partner"),
      llm: {
        provider: "openai",
        model: readString(readObject(parsed.llm).model, "gpt-4o"),
        temperature: readNumber(readObject(parsed.llm).temperature, 0.7),
        maxTokens: readNumber(readObject(parsed.llm).max_tokens, 4096),
      },
      packs: {
        core: readString(readObject(parsed.packs).core, ".airic/packs/core"),
      },
      specPaths: {
        roles: readString(
          readObject(parsed.spec_paths).roles,
          ".airic/specs/roles",
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

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
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
