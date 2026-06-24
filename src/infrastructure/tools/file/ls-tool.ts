import { constants } from "node:fs";
import { access, readdir, stat } from "node:fs/promises";
import type { AiricToolContext } from "../../../domain/tool/tool.js";
import type { AiricToolResult } from "../../../domain/tool/tool-result.js";
import { resolveWithinWorkspace } from "../common/path-utils.js";
import { truncateHead } from "../common/truncate.js";

const DEFAULT_LS_LIMIT = 500;

export type LsToolInput = {
  path?: string;
};

export async function executeLsTool(
  input: LsToolInput,
  context: AiricToolContext,
): Promise<AiricToolResult> {
  const searchPath = resolveWithinWorkspace(input.path ?? ".", context.cwd);
  await access(searchPath, constants.R_OK);

  const stats = await stat(searchPath);
  if (!stats.isDirectory()) {
    throw new Error(`Not a directory: ${input.path ?? "."}`);
  }

  const entries = await readdir(searchPath, { withFileTypes: true });
  const formatted = entries
    .map((entry) => {
      const suffix = entry.isDirectory() ? "/" : "";
      return `${entry.name}${suffix}`;
    })
    .sort((a, b) => a.localeCompare(b));

  const limited = formatted.slice(0, DEFAULT_LS_LIMIT);
  const rawOutput = limited.join("\n");
  const truncation = truncateHead(rawOutput, { maxLines: DEFAULT_LS_LIMIT });

  let output = truncation.content;
  const notices: string[] = [];

  if (formatted.length > DEFAULT_LS_LIMIT) {
    notices.push(`${DEFAULT_LS_LIMIT} entries limit reached`);
  }
  if (truncation.truncated) {
    notices.push("output truncated");
  }
  if (notices.length > 0) {
    output += `\n\n[${notices.join(". ")}]`;
  }

  if (limited.length === 0) {
    output = "(empty directory)";
  }

  return {
    content: [{ type: "text", text: output }],
    details: truncation.truncated ? { truncation } : undefined,
  };
}

export const LS_TOOL_DESCRIPTION =
  "List files and directories at a path. Directories have trailing slashes. Includes dotfiles.";

export const LS_TOOL_SCHEMA = {
  type: "object",
  properties: {
    path: {
      type: "string",
      description: "Directory path relative to workspace root. Defaults to '.'",
    },
  },
};
