import { join } from "node:path";
import type { HistoryAuditEntry } from "../../domain/tool/pending-history-change.js";
import type { FileSystemPort } from "../ports/file-system-port.js";

export class HistoryAuditLog {
  constructor(
    private readonly fs: FileSystemPort,
    private readonly workspaceRoot: string,
  ) {}

  private logPath(): string {
    return join(this.workspaceRoot, ".airic", "logs", "history.log");
  }

  async append(entry: HistoryAuditEntry): Promise<void> {
    const line = `${JSON.stringify(entry)}\n`;
    await this.fs.appendText(this.logPath(), line);
  }
}
