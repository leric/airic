import type { PendingEdit } from "../../domain/tool/pending-edit.js";

export class EditStore {
  private readonly edits = new Map<string, PendingEdit>();

  store(edit: PendingEdit): void {
    this.edits.set(edit.id, edit);
  }

  get(editId: string): PendingEdit | undefined {
    return this.edits.get(editId);
  }

  require(editId: string): PendingEdit {
    const edit = this.get(editId);
    if (!edit) {
      throw new Error(`Edit not found: ${editId}`);
    }
    return edit;
  }

  delete(editId: string): void {
    this.edits.delete(editId);
  }
}
