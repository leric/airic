import { writeFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { AiricToolResult } from "../../domain/tool/tool-result.js";
import { withFileMutationQueue } from "./common/file-mutation-queue.js";

export async function applyPendingMutation(
  absolutePath: string,
  result: AiricToolResult,
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
