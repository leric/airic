import { constants } from "node:fs";
import { access, readFile, writeFile } from "node:fs/promises";
import type { AiricToolContext } from "../../../domain/tool/tool.js";
import type { AiricToolResult } from "../../../domain/tool/tool-result.js";
import {
  applyEditsToNormalizedContent,
  detectLineEnding,
  type Edit,
  generateDiffString,
  generateUnifiedPatch,
  normalizeToLF,
  restoreLineEndings,
  stripBom,
} from "../common/edit-diff.js";
import { withFileMutationQueue } from "../common/file-mutation-queue.js";
import { resolveWithinWorkspace } from "../common/path-utils.js";

export type EditToolInput = {
  path: string;
  edits: Edit[];
};

function prepareEditInput(input: Record<string, unknown>): EditToolInput {
  if (typeof input.edits === "string") {
    try {
      const parsed = JSON.parse(input.edits);
      if (Array.isArray(parsed)) {
        input = { ...input, edits: parsed };
      }
    } catch {
      // keep original
    }
  }

  if (
    typeof input.oldText === "string" &&
    typeof input.newText === "string"
  ) {
    const edits = Array.isArray(input.edits) ? [...input.edits] : [];
    edits.push({ oldText: input.oldText, newText: input.newText });
    return { path: String(input.path), edits: edits as Edit[] };
  }

  return input as EditToolInput;
}

export async function executeEditTool(
  rawInput: Record<string, unknown>,
  context: AiricToolContext,
  signal?: AbortSignal,
): Promise<AiricToolResult> {
  const input = prepareEditInput(rawInput);
  if (!Array.isArray(input.edits) || input.edits.length === 0) {
    throw new Error("Edit tool input is invalid. edits must contain at least one replacement.");
  }

  const absolutePath = resolveWithinWorkspace(input.path, context.cwd);

  return withFileMutationQueue(absolutePath, async () => {
    const throwIfAborted = (): void => {
      if (signal?.aborted) throw new Error("Operation aborted");
    };

    throwIfAborted();

    try {
      await access(absolutePath, constants.R_OK | constants.W_OK);
    } catch (error: unknown) {
      throwIfAborted();
      const errorMessage =
        error instanceof Error && "code" in error
          ? `Error code: ${error.code}`
          : String(error);
      throw new Error(`Could not edit file: ${input.path}. ${errorMessage}.`);
    }

    throwIfAborted();

    const buffer = await readFile(absolutePath);
    const rawContent = buffer.toString("utf-8");
    throwIfAborted();

    const { bom, text: content } = stripBom(rawContent);
    const originalEnding = detectLineEnding(content);
    const normalizedContent = normalizeToLF(content);
    const { baseContent, newContent } = applyEditsToNormalizedContent(
      normalizedContent,
      input.edits,
      input.path,
    );
    throwIfAborted();

    const finalContent = bom + restoreLineEndings(newContent, originalEnding);
    const diffResult = generateDiffString(baseContent, newContent);
    const patch = generateUnifiedPatch(input.path, baseContent, newContent);

    return {
      content: [
        {
          type: "diff",
          path: absolutePath,
          oldText: rawContent,
          newText: finalContent,
        },
        {
          type: "text",
          text: `Successfully replaced ${input.edits.length} block(s) in ${input.path}.`,
        },
      ],
      details: {
        diff: diffResult.diff,
        patch,
        firstChangedLine: diffResult.firstChangedLine,
        pendingWrite: finalContent,
      },
    };
  });
}

export async function applyEditWrite(
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
    await writeFile(absolutePath, pendingWrite, "utf-8");
  });
}

export const EDIT_TOOL_DESCRIPTION =
  "Edit a single file using exact text replacement. Every edits[].oldText must match a unique, non-overlapping region of the original file. If two changes affect the same block or nearby lines, merge them into one edit instead of emitting overlapping edits.";

export const EDIT_TOOL_SCHEMA = {
  type: "object",
  properties: {
    path: {
      type: "string",
      description: "Path to the file to edit (relative or absolute)",
    },
    edits: {
      type: "array",
      description:
        "One or more targeted replacements matched against the original file, not incrementally.",
      items: {
        type: "object",
        properties: {
          oldText: {
            type: "string",
            description: "Exact text for one targeted replacement.",
          },
          newText: {
            type: "string",
            description: "Replacement text for this targeted edit.",
          },
        },
        required: ["oldText", "newText"],
      },
    },
  },
  required: ["path", "edits"],
};
