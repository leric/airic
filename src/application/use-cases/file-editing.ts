import { randomUUID } from "node:crypto";
import type { FileSystemPort } from "../ports/file-system-port.js";
import type { SessionStorePort } from "../ports/session-store-port.js";
import type { CurrentDocumentContext } from "../services/current-document-context.js";
import { setActiveDocument } from "../services/document-focus.js";
import { PathResolver } from "../services/path-resolver.js";
import type { WorkspaceRuntime } from "../services/workspace-runtime-loader.js";

export type OpenDocumentResult = CurrentDocumentContext;

export type OpenDocumentDeps = {
  fs: FileSystemPort;
  sessionStore: SessionStorePort;
  runtime: WorkspaceRuntime;
};

export class OpenDocumentUseCase {
  constructor(private readonly deps: OpenDocumentDeps) {}

  async execute(sessionId: string, documentPath: string): Promise<OpenDocumentResult> {
    const session = await this.deps.sessionStore.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const result = await setActiveDocument(
      this.deps.fs,
      session,
      this.deps.runtime.specRegistry,
      documentPath,
    );
    await this.deps.sessionStore.save(session);
    return result;
  }
}

export type ProposeFileEditInput = {
  sessionId: string;
  path: string;
  newContent: string;
};

export type ProposeFileEditDeps = {
  fs: FileSystemPort;
  sessionStore: SessionStorePort;
  diffService: { createPatch(path: string, original: string, next: string): string };
  editStore: { store(edit: import("../../domain/tool/pending-edit.js").PendingEdit): void };
};

export class ProposeFileEditUseCase {
  constructor(private readonly deps: ProposeFileEditDeps) {}

  async execute(input: ProposeFileEditInput) {
    const session = await this.deps.sessionStore.get(input.sessionId);
    if (!session) {
      throw new Error(`Session not found: ${input.sessionId}`);
    }

    const pathResolver = new PathResolver(session.workspaceRoot);
    const path = pathResolver.resolve(input.path);
    const originalContent = (await this.deps.fs.exists(path))
      ? await this.deps.fs.readText(path)
      : "";

    const diff = this.deps.diffService.createPatch(
      pathResolver.toRelative(path),
      originalContent,
      input.newContent,
    );

    const edit = {
      id: randomUUID(),
      sessionId: input.sessionId,
      path,
      originalContent,
      newContent: input.newContent,
      diff,
      createdAt: new Date().toISOString(),
    };

    this.deps.editStore.store(edit);
    return edit;
  }
}

export type ApplyFileEditDeps = {
  fs: FileSystemPort;
  sessionStore: SessionStorePort;
  editStore: {
    require(editId: string): import("../../domain/tool/pending-edit.js").PendingEdit;
    delete(editId: string): void;
  };
  editLog: { append(entry: import("../../domain/tool/pending-edit.js").EditLogEntry): Promise<void> };
};

export class ApplyFileEditUseCase {
  constructor(private readonly deps: ApplyFileEditDeps) {}

  async execute(sessionId: string, editId: string): Promise<void> {
    const edit = this.deps.editStore.require(editId);
    if (edit.sessionId !== sessionId) {
      throw new Error(`Edit ${editId} does not belong to session ${sessionId}`);
    }

    await this.deps.fs.writeText(edit.path, edit.newContent);
    await this.deps.editLog.append({
      timestamp: new Date().toISOString(),
      sessionId,
      editId,
      path: edit.path,
      diff: edit.diff,
    });

    const session = await this.deps.sessionStore.get(sessionId);
    if (session) {
      session.updatedAt = new Date().toISOString();
      await this.deps.sessionStore.save(session);
    }

    this.deps.editStore.delete(editId);
  }
}
