import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import type { AiricToolContext } from "../../../domain/tool/tool.js";
import type { AiricToolResult } from "../../../domain/tool/tool-result.js";
import { resolveReadPathAsync } from "../common/path-utils.js";
import {
  DEFAULT_MAX_BYTES,
  DEFAULT_MAX_LINES,
  formatSize,
  truncateHead,
} from "../common/truncate.js";

export type ReadToolInput = {
  path: string;
  offset?: number;
  limit?: number;
};

export async function executeReadTool(
  input: ReadToolInput,
  context: AiricToolContext,
  signal?: AbortSignal,
): Promise<AiricToolResult> {
  if (signal?.aborted) {
    throw new Error("Operation aborted");
  }

  const absolutePath = await resolveReadPathAsync(input.path, context.cwd);
  await access(absolutePath, constants.R_OK);

  if (signal?.aborted) {
    throw new Error("Operation aborted");
  }

  const buffer = await readFile(absolutePath);
  const textContent = buffer.toString("utf-8");
  const allLines = textContent.split("\n");
  const totalFileLines = allLines.length;

  const startLine = input.offset ? Math.max(0, input.offset - 1) : 0;
  const startLineDisplay = startLine + 1;

  if (startLine >= allLines.length) {
    throw new Error(
      `Offset ${input.offset} is beyond end of file (${allLines.length} lines total)`,
    );
  }

  let selectedContent: string;
  let userLimitedLines: number | undefined;

  if (input.limit !== undefined) {
    const endLine = Math.min(startLine + input.limit, allLines.length);
    selectedContent = allLines.slice(startLine, endLine).join("\n");
    userLimitedLines = endLine - startLine;
  } else {
    selectedContent = allLines.slice(startLine).join("\n");
  }

  const truncation = truncateHead(selectedContent);
  let outputText: string;
  let details: Record<string, unknown> | undefined;

  if (truncation.firstLineExceedsLimit) {
    const firstLineSize = formatSize(
      Buffer.byteLength(allLines[startLine] ?? "", "utf-8"),
    );
    outputText = `[Line ${startLineDisplay} is ${firstLineSize}, exceeds ${formatSize(DEFAULT_MAX_BYTES)} limit. Use bash: sed -n '${startLineDisplay}p' ${input.path} | head -c ${DEFAULT_MAX_BYTES}]`;
    details = { truncation };
  } else if (truncation.truncated) {
    const endLineDisplay = startLineDisplay + truncation.outputLines - 1;
    const nextOffset = endLineDisplay + 1;
    outputText = truncation.content;
    if (truncation.truncatedBy === "lines") {
      outputText += `\n\n[Showing lines ${startLineDisplay}-${endLineDisplay} of ${totalFileLines}. Use offset=${nextOffset} to continue.]`;
    } else {
      outputText += `\n\n[Showing lines ${startLineDisplay}-${endLineDisplay} of ${totalFileLines} (${formatSize(DEFAULT_MAX_BYTES)} limit). Use offset=${nextOffset} to continue.]`;
    }
    details = { truncation };
  } else if (
    userLimitedLines !== undefined &&
    startLine + userLimitedLines < allLines.length
  ) {
    const remaining = allLines.length - (startLine + userLimitedLines);
    const nextOffset = startLine + userLimitedLines + 1;
    outputText = `${truncation.content}\n\n[${remaining} more lines in file. Use offset=${nextOffset} to continue.]`;
  } else {
    outputText = truncation.content;
  }

  return {
    content: [{ type: "text", text: outputText }],
    details,
  };
}

export const READ_TOOL_DESCRIPTION = `Read the contents of a file. Output is truncated to ${DEFAULT_MAX_LINES} lines or ${DEFAULT_MAX_BYTES / 1024}KB (whichever is hit first). Use offset/limit for large files. When you need the full file, continue with offset until complete.`;

export const READ_TOOL_SCHEMA = {
  type: "object",
  properties: {
    path: {
      type: "string",
      description: "Path to the file to read (relative or absolute)",
    },
    offset: {
      type: "number",
      description: "Line number to start reading from (1-indexed)",
    },
    limit: {
      type: "number",
      description: "Maximum number of lines to read",
    },
  },
  required: ["path"],
};
