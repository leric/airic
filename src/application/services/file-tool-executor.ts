import type { PendingEdit } from "../../domain/tool/pending-edit.js";
import type { Session } from "../../domain/session/session.js";
import type { LlmToolCall } from "../ports/llm-port.js";
import type { FileSystemPort } from "../ports/file-system-port.js";
import type { SessionStorePort } from "../ports/session-store-port.js";
import { KERNEL_TOOL_NAMES } from "../../domain/tool/tool-names.js";
import { PathResolver } from "./path-resolver.js";
import {
  ApplyFileEditUseCase,
  ProposeFileEditUseCase,
} from "../use-cases/file-editing.js";
import type { EditStore } from "./edit-store.js";
import type { EditLog } from "./edit-log.js";
import type { DiffService } from "../../infrastructure/diff/diff-service.js";

export type ToolExecutionEvents = {
  onProposeEdit: (
    edit: PendingEdit,
    toolCallId: string,
  ) => Promise<"allow" | "reject">;
};

export type FileToolExecutorDeps = {
  fs: FileSystemPort;
  sessionStore: SessionStorePort;
  diffService: DiffService;
  editStore: EditStore;
  editLog: EditLog;
};

export class FileToolExecutor {
  private readonly proposeEdit: ProposeFileEditUseCase;
  private readonly applyEdit: ApplyFileEditUseCase;

  constructor(private readonly deps: FileToolExecutorDeps) {
    this.proposeEdit = new ProposeFileEditUseCase({
      fs: deps.fs,
      sessionStore: deps.sessionStore,
      diffService: deps.diffService,
      editStore: deps.editStore,
    });
    this.applyEdit = new ApplyFileEditUseCase({
      fs: deps.fs,
      sessionStore: deps.sessionStore,
      editStore: deps.editStore,
      editLog: deps.editLog,
    });
  }

  async execute(
    session: Session,
    toolCall: LlmToolCall,
    events: ToolExecutionEvents,
  ): Promise<string> {
    const args = parseToolArguments(toolCall.arguments);

    switch (toolCall.name) {
      case KERNEL_TOOL_NAMES.LIST_FILES:
        return this.listFiles(session, String(args.path ?? "."));
      case KERNEL_TOOL_NAMES.READ_FILE:
        return this.readFile(session, String(args.path));
      case KERNEL_TOOL_NAMES.CREATE_FILE:
        return this.createFile(session, args);
      case KERNEL_TOOL_NAMES.PROPOSE_EDIT:
        return this.proposeEditFile(session, toolCall.id, args, events);
      case KERNEL_TOOL_NAMES.SEARCH_TEXT:
        return this.searchText(session, args);
      default:
        throw new Error(`Unknown tool: ${toolCall.name}`);
    }
  }

  private pathResolver(session: Session): PathResolver {
    return new PathResolver(session.workspaceRoot);
  }

  private async listFiles(session: Session, inputPath: string): Promise<string> {
    const path = this.pathResolver(session).resolve(inputPath);
    const exists = await this.deps.fs.exists(path);
    if (!exists) {
      return `Directory not found: ${inputPath}`;
    }

    const entries = await this.deps.fs.listEntries(path);
    if (entries.length === 0) {
      return `No entries in ${inputPath}`;
    }

    return entries
      .map((entry) => `${entry.type === "directory" ? "[dir]" : "[file]"} ${entry.name}`)
      .join("\n");
  }

  private async readFile(session: Session, inputPath: string): Promise<string> {
    const path = this.pathResolver(session).resolve(inputPath);
    const exists = await this.deps.fs.exists(path);
    if (!exists) {
      return `File not found: ${inputPath}`;
    }
    return this.deps.fs.readText(path);
  }

  private async createFile(
    session: Session,
    args: Record<string, unknown>,
  ): Promise<string> {
    const inputPath = String(args.path ?? "");
    const content = String(args.content ?? "");
    const setCurrentDocument = args.set_current_document === true;

    const path = this.pathResolver(session).resolve(inputPath);
    const exists = await this.deps.fs.exists(path);
    if (exists) {
      return `File already exists: ${inputPath}. Use propose_edit to modify it.`;
    }

    await this.deps.fs.writeText(path, content);

    if (setCurrentDocument) {
      session.currentDocument = path;
      session.updatedAt = new Date().toISOString();
      await this.deps.sessionStore.save(session);
    }

    return `Created file: ${inputPath}`;
  }

  private async proposeEditFile(
    session: Session,
    toolCallId: string,
    args: Record<string, unknown>,
    events: ToolExecutionEvents,
  ): Promise<string> {
    const inputPath = String(args.path ?? "");
    const content = String(args.content ?? "");

    const edit = await this.proposeEdit.execute({
      sessionId: session.id,
      path: inputPath,
      newContent: content,
    });

    const decision = await events.onProposeEdit(edit, toolCallId);
    if (decision === "allow") {
      await this.applyEdit.execute(session.id, edit.id);
      session.currentDocument = edit.path;
      session.updatedAt = new Date().toISOString();
      await this.deps.sessionStore.save(session);
      return `Edit applied to ${inputPath}.`;
    }

    this.deps.editStore.delete(edit.id);
    return `Edit rejected by user for ${inputPath}.`;
  }

  private async searchText(
    session: Session,
    args: Record<string, unknown>,
  ): Promise<string> {
    const query = String(args.query ?? "");
    const searchRoot = this.pathResolver(session).resolve(
      String(args.path ?? "."),
    );
    const matches = await this.deps.fs.searchText(searchRoot, query);

    if (matches.length === 0) {
      return `No matches for "${query}"`;
    }

    return matches
      .map((match) => `${this.pathResolver(session).toRelative(match.path)}:${match.line}: ${match.text}`)
      .join("\n");
  }
}

function parseToolArguments(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(`Invalid tool arguments JSON: ${raw}`);
  }
}
