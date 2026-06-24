import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { constants } from "node:fs";
import { access, readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import type { AiricToolDefinition } from "../../../domain/tool/tool.js";
import { KERNEL_TOOL_NAMES } from "../../../domain/tool/tool-names.js";
import type { AiricToolContext } from "../../../domain/tool/tool.js";
import type { AiricToolResult } from "../../../domain/tool/tool-result.js";
import { pathExists, resolveWithinWorkspace, toRelativePath } from "../common/path-utils.js";
import { DEFAULT_MAX_BYTES, formatSize, truncateHead } from "../common/truncate.js";

const DEFAULT_LIMIT = 1000;

export type FindToolInput = {
  pattern: string;
  path?: string;
  limit?: number;
};

async function isInsideGitRepo(searchPath: string): Promise<boolean> {
  for (let current = searchPath; ; ) {
    if (await pathExists(join(current, ".git"))) {
      return true;
    }
    const parent = join(current, "..");
    if (parent === current) break;
    current = parent;
  }
  return false;
}

async function findWithFd(
  pattern: string,
  searchPath: string,
  effectiveLimit: number,
  signal?: AbortSignal,
): Promise<string[]> {
  const args: string[] = ["--glob", "--color=never", "--hidden"];

  if (!(await isInsideGitRepo(searchPath))) {
    args.push("--no-require-git");
  }
  args.push("--max-results", String(effectiveLimit));

  let effectivePattern = pattern;
  if (pattern.includes("/")) {
    args.push("--full-path");
    if (
      !pattern.startsWith("/") &&
      !pattern.startsWith("**/") &&
      pattern !== "**"
    ) {
      effectivePattern = `**/${pattern}`;
    }
  }
  args.push("--", effectivePattern, searchPath);

  return new Promise((resolve, reject) => {
    const child = spawn("fd", args, { stdio: ["ignore", "pipe", "pipe"] });
    const rl = createInterface({ input: child.stdout! });
    const lines: string[] = [];
    let stderr = "";

    const onAbort = () => {
      if (!child.killed) child.kill();
    };
    signal?.addEventListener("abort", onAbort, { once: true });

    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    rl.on("line", (line) => {
      lines.push(line);
    });

    child.on("error", () => {
      signal?.removeEventListener("abort", onAbort);
      reject(new Error("fd_not_available"));
    });

    child.on("close", (code) => {
      signal?.removeEventListener("abort", onAbort);
      if (signal?.aborted) {
        reject(new Error("Operation aborted"));
        return;
      }
      if (code !== 0 && lines.length === 0) {
        reject(new Error(stderr.trim() || `fd exited with code ${code}`));
        return;
      }
      resolve(lines);
    });
  });
}

function globMatch(pattern: string, name: string): boolean {
  const regex = new RegExp(
    "^" +
      pattern
        .replace(/\./g, "\\.")
        .replace(/\*\*/g, "___GLOBSTAR___")
        .replace(/\*/g, "[^/]*")
        .replace(/___GLOBSTAR___/g, ".*") +
      "$",
  );
  return regex.test(name);
}

async function findWithNodeFallback(
  pattern: string,
  searchPath: string,
  effectiveLimit: number,
): Promise<string[]> {
  const results: string[] = [];

  const walk = async (dirPath: string): Promise<void> => {
    if (results.length >= effectiveLimit) return;

    const entries = await readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (results.length >= effectiveLimit) return;

      if (entry.name === ".git" || entry.name === "node_modules") {
        continue;
      }

      const fullPath = join(dirPath, entry.name);
      const relPath = toRelativePath(searchPath, fullPath);

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (globMatch(pattern, relPath) || globMatch(pattern, entry.name)) {
        results.push(relPath);
      }
    }
  };

  await walk(searchPath);
  return results;
}

export async function executeFindTool(
  input: FindToolInput,
  context: AiricToolContext,
  signal?: AbortSignal,
): Promise<AiricToolResult> {
  if (signal?.aborted) {
    throw new Error("Operation aborted");
  }

  const searchPath = resolveWithinWorkspace(input.path ?? ".", context.cwd);
  await access(searchPath, constants.R_OK);

  const stats = await stat(searchPath);
  if (!stats.isDirectory()) {
    throw new Error(`Not a directory: ${input.path ?? "."}`);
  }

  const effectiveLimit = input.limit ?? DEFAULT_LIMIT;
  let rawLines: string[];

  try {
    rawLines = await findWithFd(input.pattern, searchPath, effectiveLimit, signal);
  } catch (error) {
    if (error instanceof Error && error.message === "fd_not_available") {
      rawLines = await findWithNodeFallback(input.pattern, searchPath, effectiveLimit);
    } else {
      throw error;
    }
  }

  const relativized: string[] = [];
  for (const rawLine of rawLines) {
    const line = rawLine.replace(/\r$/, "").trim();
    if (!line) continue;
    const hadTrailingSlash = line.endsWith("/") || line.endsWith("\\");
    let relativePath = line;
    if (line.startsWith(searchPath)) {
      relativePath = line.slice(searchPath.length + 1);
    } else {
      relativePath = relative(searchPath, line);
    }
    if (hadTrailingSlash && !relativePath.endsWith("/")) {
      relativePath += "/";
    }
    relativized.push(relativePath.replace(/\\/g, "/"));
  }

  if (relativized.length === 0) {
    return {
      content: [{ type: "text", text: "No files found matching pattern" }],
    };
  }

  const resultLimitReached = relativized.length >= effectiveLimit;
  const rawOutput = relativized.join("\n");
  const truncation = truncateHead(rawOutput, { maxLines: Number.MAX_SAFE_INTEGER });

  let resultOutput = truncation.content;
  const notices: string[] = [];

  if (resultLimitReached) {
    notices.push(
      `${effectiveLimit} results limit reached. Use limit=${effectiveLimit * 2} for more, or refine pattern`,
    );
  }
  if (truncation.truncated) {
    notices.push(`${formatSize(DEFAULT_MAX_BYTES)} limit reached`);
  }
  if (notices.length > 0) {
    resultOutput += `\n\n[${notices.join(". ")}]`;
  }

  return {
    content: [{ type: "text", text: resultOutput }],
    details: {
      ...(resultLimitReached ? { resultLimitReached: effectiveLimit } : {}),
      ...(truncation.truncated ? { truncation } : {}),
    },
  };
}

export const FIND_TOOL_DESCRIPTION = `Search for files by glob pattern. Returns matching file paths relative to the search directory. Respects .gitignore when fd is available. Output is truncated to ${DEFAULT_LIMIT} results or ${DEFAULT_MAX_BYTES / 1024}KB.`;

export const FIND_TOOL_SCHEMA = {
  type: "object",
  properties: {
    pattern: {
      type: "string",
      description: "Glob pattern to match files, e.g. '*.ts' or '**/*.json'",
    },
    path: {
      type: "string",
      description: "Directory to search in (default: current directory)",
    },
    limit: {
      type: "number",
      description: "Maximum number of results (default: 1000)",
    },
  },
  required: ["pattern"],
};

export function createFindTool(): AiricToolDefinition {
  return {
    name: KERNEL_TOOL_NAMES.FIND,
    kind: "search",
    description: FIND_TOOL_DESCRIPTION,
    inputSchema: FIND_TOOL_SCHEMA,
    policy: "none",
    confirmation: "none",
    present: (args) => {
      const path = typeof args.path === "string" ? args.path : undefined;
      return {
        title: `Find ${String(args.pattern ?? "")}`,
        kind: "search",
        rawInput: args,
        locations: path ? [{ path }] : undefined,
      };
    },
    execute: (input, context, signal) =>
      executeFindTool(input as FindToolInput, context, signal),
  };
}
