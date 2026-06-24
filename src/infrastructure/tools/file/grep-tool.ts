import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { constants } from "node:fs";
import { access, readFile, stat } from "node:fs/promises";
import { basename, relative } from "node:path";
import type { AiricToolContext } from "../../../domain/tool/tool.js";
import type { AiricToolResult } from "../../../domain/tool/tool-result.js";
import { resolveWithinWorkspace } from "../common/path-utils.js";
import {
  DEFAULT_MAX_BYTES,
  formatSize,
  GREP_MAX_LINE_LENGTH,
  truncateHead,
  truncateLine,
} from "../common/truncate.js";

const DEFAULT_LIMIT = 100;

export type GrepToolInput = {
  pattern: string;
  path?: string;
  glob?: string;
  ignoreCase?: boolean;
  literal?: boolean;
  context?: number;
  limit?: number;
};

async function grepWithRg(
  input: GrepToolInput,
  searchPath: string,
  isDirectory: boolean,
  effectiveLimit: number,
  signal?: AbortSignal,
): Promise<{ outputLines: string[]; matchLimitReached: boolean; linesTruncated: boolean }> {
  return new Promise((resolve, reject) => {
    const args: string[] = ["--json", "--line-number", "--color=never", "--hidden"];
    if (input.ignoreCase) args.push("--ignore-case");
    if (input.literal) args.push("--fixed-strings");
    if (input.glob) args.push("--glob", input.glob);
    args.push("--", input.pattern, searchPath);

    const child = spawn("rg", args, { stdio: ["ignore", "pipe", "pipe"] });
    const rl = createInterface({ input: child.stdout! });
    let stderr = "";
    let matchCount = 0;
    let matchLimitReached = false;
    let linesTruncated = false;
    let killedDueToLimit = false;
    const matches: Array<{ filePath: string; lineNumber: number; lineText?: string }> = [];

    const onAbort = () => {
      if (!child.killed) child.kill();
    };
    signal?.addEventListener("abort", onAbort, { once: true });

    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    rl.on("line", (line) => {
      if (!line.trim() || matchCount >= effectiveLimit) return;
      let event: { type?: string; data?: { path?: { text?: string }; line_number?: number; lines?: { text?: string } } };
      try {
        event = JSON.parse(line);
      } catch {
        return;
      }
      if (event.type === "match") {
        matchCount++;
        const filePath = event.data?.path?.text;
        const lineNumber = event.data?.line_number;
        const lineText = event.data?.lines?.text;
        if (filePath && typeof lineNumber === "number") {
          matches.push({ filePath, lineNumber, lineText });
        }
        if (matchCount >= effectiveLimit) {
          matchLimitReached = true;
          killedDueToLimit = true;
          if (!child.killed) child.kill();
        }
      }
    });

    child.on("error", () => {
      signal?.removeEventListener("abort", onAbort);
      reject(new Error("rg_not_available"));
    });

    child.on("close", async (code) => {
      signal?.removeEventListener("abort", onAbort);
      if (signal?.aborted) {
        reject(new Error("Operation aborted"));
        return;
      }
      if (!killedDueToLimit && code !== 0 && code !== 1) {
        reject(new Error(stderr.trim() || `ripgrep exited with code ${code}`));
        return;
      }

      const contextValue = input.context && input.context > 0 ? input.context : 0;
      const outputLines: string[] = [];
      const fileCache = new Map<string, string[]>();

      const formatPath = (filePath: string): string => {
        if (isDirectory) {
          const rel = relative(searchPath, filePath);
          if (rel && !rel.startsWith("..")) {
            return rel.replace(/\\/g, "/");
          }
        }
        return basename(filePath);
      };

      const getFileLines = async (filePath: string): Promise<string[]> => {
        let lines = fileCache.get(filePath);
        if (!lines) {
          try {
            const content = await readFile(filePath, "utf-8");
            lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
          } catch {
            lines = [];
          }
          fileCache.set(filePath, lines);
        }
        return lines;
      };

      for (const match of matches) {
        if (contextValue === 0 && match.lineText !== undefined) {
          const relativePath = formatPath(match.filePath);
          const sanitized = match.lineText
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "")
            .replace(/\n$/, "");
          const { text: truncatedText, wasTruncated } = truncateLine(sanitized);
          if (wasTruncated) linesTruncated = true;
          outputLines.push(`${relativePath}:${match.lineNumber}: ${truncatedText}`);
        } else {
          const lines = await getFileLines(match.filePath);
          const relativePath = formatPath(match.filePath);
          const start =
            contextValue > 0 ? Math.max(1, match.lineNumber - contextValue) : match.lineNumber;
          const end =
            contextValue > 0
              ? Math.min(lines.length, match.lineNumber + contextValue)
              : match.lineNumber;
          for (let current = start; current <= end; current++) {
            const lineText = lines[current - 1] ?? "";
            const sanitized = lineText.replace(/\r/g, "");
            const { text: truncatedText, wasTruncated } = truncateLine(sanitized);
            if (wasTruncated) linesTruncated = true;
            if (current === match.lineNumber) {
              outputLines.push(`${relativePath}:${current}: ${truncatedText}`);
            } else {
              outputLines.push(`${relativePath}-${current}- ${truncatedText}`);
            }
          }
        }
      }

      resolve({ outputLines, matchLimitReached, linesTruncated });
    });
  });
}

async function grepWithNodeFallback(
  input: GrepToolInput,
  searchPath: string,
  isDirectory: boolean,
  effectiveLimit: number,
): Promise<{ outputLines: string[]; matchLimitReached: boolean; linesTruncated: boolean }> {
  const { NodeFileSystem } = await import("../../fs/node-file-system.js");
  const fs = new NodeFileSystem();
  const matches = await fs.searchText(searchPath, input.pattern);
  const outputLines: string[] = [];
  let linesTruncated = false;

  for (const match of matches.slice(0, effectiveLimit)) {
    const relativePath = isDirectory
      ? relative(searchPath, match.path).replace(/\\/g, "/")
      : basename(match.path);
    const { text: truncatedText, wasTruncated } = truncateLine(match.text);
    if (wasTruncated) linesTruncated = true;
    outputLines.push(`${relativePath}:${match.line}: ${truncatedText}`);
  }

  return {
    outputLines,
    matchLimitReached: matches.length >= effectiveLimit,
    linesTruncated,
  };
}

export async function executeGrepTool(
  input: GrepToolInput,
  context: AiricToolContext,
  signal?: AbortSignal,
): Promise<AiricToolResult> {
  if (signal?.aborted) {
    throw new Error("Operation aborted");
  }

  const searchPath = resolveWithinWorkspace(input.path ?? ".", context.cwd);
  await access(searchPath, constants.R_OK);

  const stats = await stat(searchPath);
  const isDirectory = stats.isDirectory();
  const effectiveLimit = Math.max(1, input.limit ?? DEFAULT_LIMIT);

  let result: {
    outputLines: string[];
    matchLimitReached: boolean;
    linesTruncated: boolean;
  };

  try {
    result = await grepWithRg(input, searchPath, isDirectory, effectiveLimit, signal);
  } catch (error) {
    if (error instanceof Error && error.message === "rg_not_available") {
      result = await grepWithNodeFallback(input, searchPath, isDirectory, effectiveLimit);
    } else {
      throw error;
    }
  }

  if (result.outputLines.length === 0) {
    return { content: [{ type: "text", text: "No matches found" }] };
  }

  const rawOutput = result.outputLines.join("\n");
  const truncation = truncateHead(rawOutput, { maxLines: Number.MAX_SAFE_INTEGER });
  let output = truncation.content;
  const details: Record<string, unknown> = {};
  const notices: string[] = [];

  if (result.matchLimitReached) {
    notices.push(
      `${effectiveLimit} matches limit reached. Use limit=${effectiveLimit * 2} for more, or refine pattern`,
    );
    details.matchLimitReached = effectiveLimit;
  }
  if (truncation.truncated) {
    notices.push(`${formatSize(DEFAULT_MAX_BYTES)} limit reached`);
    details.truncation = truncation;
  }
  if (result.linesTruncated) {
    notices.push(
      `Some lines truncated to ${GREP_MAX_LINE_LENGTH} chars. Use read tool to see full lines`,
    );
    details.linesTruncated = true;
  }
  if (notices.length > 0) {
    output += `\n\n[${notices.join(". ")}]`;
  }

  return {
    content: [{ type: "text", text: output }],
    details: Object.keys(details).length > 0 ? details : undefined,
  };
}

export const GREP_TOOL_DESCRIPTION = `Search file contents for a pattern. Returns matching lines with file paths and line numbers. Respects .gitignore when ripgrep is available. Output is truncated to ${DEFAULT_LIMIT} matches or ${DEFAULT_MAX_BYTES / 1024}KB. Long lines are truncated to ${GREP_MAX_LINE_LENGTH} chars.`;

export const GREP_TOOL_SCHEMA = {
  type: "object",
  properties: {
    pattern: {
      type: "string",
      description: "Search pattern (regex or literal string)",
    },
    path: {
      type: "string",
      description: "Directory or file to search (default: current directory)",
    },
    glob: {
      type: "string",
      description: "Filter files by glob pattern, e.g. '*.ts'",
    },
    ignoreCase: {
      type: "boolean",
      description: "Case-insensitive search (default: false)",
    },
    literal: {
      type: "boolean",
      description: "Treat pattern as literal string instead of regex (default: false)",
    },
    context: {
      type: "number",
      description: "Number of lines to show before and after each match (default: 0)",
    },
    limit: {
      type: "number",
      description: "Maximum number of matches to return (default: 100)",
    },
  },
  required: ["pattern"],
};
