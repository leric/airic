import { randomUUID } from "node:crypto";
import type { PendingHistoryChange } from "../../domain/tool/pending-history-change.js";

export class HistoryChangeStore {
  private readonly pending = new Map<string, PendingHistoryChange>();

  create(
    input: Omit<PendingHistoryChange, "id" | "createdAt">,
  ): PendingHistoryChange {
    const change: PendingHistoryChange = {
      ...input,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.pending.set(change.id, change);
    return change;
  }

  get(id: string): PendingHistoryChange | undefined {
    return this.pending.get(id);
  }

  delete(id: string): void {
    this.pending.delete(id);
  }
}
