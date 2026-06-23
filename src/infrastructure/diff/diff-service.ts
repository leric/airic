import { createTwoFilesPatch } from "diff";

export class DiffService {
  createPatch(
    filePath: string,
    originalContent: string,
    newContent: string,
  ): string {
    return createTwoFilesPatch(
      filePath,
      filePath,
      originalContent,
      newContent,
      undefined,
      undefined,
      { context: 3 },
    );
  }
}
