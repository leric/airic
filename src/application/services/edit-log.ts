import { join } from "node:path";
import type { EditLogEntry } from "../../domain/tool/pending-edit.js";
import type { FileSystemPort } from "../ports/file-system-port.js";

export class EditLog {
  constructor(
    private readonly fs: FileSystemPort,
    private readonly workspaceRoot: string,
  ) {}

  private logPath(): string {
    return join(this.workspaceRoot, ".airic", "logs", "edits.log");
  }

  async append(entry: EditLogEntry): Promise<void> {
    const line = `${JSON.stringify(entry)}\n`;
    await this.fs.appendText(this.logPath(), line);
  }
}
