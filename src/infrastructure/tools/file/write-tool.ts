import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { AiricToolContext } from "../../../domain/tool/tool.js";
import type { AiricToolResult } from "../../../domain/tool/tool-result.js";
import { withFileMutationQueue } from "../common/file-mutation-queue.js";
import { pathExists, resolveWithinWorkspace } from "../common/path-utils.js";

export type WriteToolInput = {
  path: string;
  content: string;
};

export async function executeWriteTool(
  input: WriteToolInput,
  context: AiricToolContext,
  signal?: AbortSignal,
): Promise<AiricToolResult> {
  const absolutePath = resolveWithinWorkspace(input.path, context.cwd);

  return withFileMutationQueue(absolutePath, async () => {
    const throwIfAborted = (): void => {
      if (signal?.aborted) throw new Error("Operation aborted");
    };

    throwIfAborted();

    const exists = await pathExists(absolutePath);
    const oldText = exists ? await readFile(absolutePath, "utf-8") : null;
    throwIfAborted();

    const dir = dirname(absolutePath);
    await mkdir(dir, { recursive: true });
    throwIfAborted();

    return {
      content: [
        {
          type: "diff",
          path: absolutePath,
          oldText,
          newText: input.content,
        },
        {
          type: "text",
          text: `Successfully wrote ${input.content.length} bytes to ${input.path}`,
        },
      ],
      details: {
        pendingWrite: input.content,
      },
    };
  });
}

export async function applyWrite(
  result: AiricToolResult,
  absolutePath: string,
  signal?: AbortSignal,
): Promise<void> {
  const pendingWrite = result.details?.pendingWrite;
  if (typeof pendingWrite !== "string") {
    throw new Error("Missing pending write content");
  }

  await withFileMutationQueue(absolutePath, async () => {
    if (signal?.aborted) throw new Error("Operation aborted");
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, pendingWrite, "utf-8");
  });
}

export const WRITE_TOOL_DESCRIPTION =
  "Write content to a file. Creates the file if it doesn't exist, overwrites if it does. Automatically creates parent directories.";

export const WRITE_TOOL_SCHEMA = {
  type: "object",
  properties: {
    path: {
      type: "string",
      description: "Path to the file to write (relative or absolute)",
    },
    content: {
      type: "string",
      description: "Content to write to the file",
    },
  },
  required: ["path", "content"],
};
