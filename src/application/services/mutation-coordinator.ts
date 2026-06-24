import { resolveWithinWorkspace } from "../../domain/path/workspace-path.js";
import type { Session } from "../../domain/session/session.js";
import { findDiffContent } from "../../domain/tool/tool-result.js";
import type { AiricToolResult } from "../../domain/tool/tool-result.js";
import type { FileSystemPort } from "../ports/file-system-port.js";
import type { SessionStorePort } from "../ports/session-store-port.js";
import type { ToolExecutionEvents } from "../ports/tool-executor-port.js";
import type { EditPermissionGate } from "../ports/agent-runtime-port.js";
import {
  ApplyFileEditUseCase,
  ProposeFileEditUseCase,
} from "../use-cases/file-editing.js";
import type { EditStore } from "./edit-store.js";
import type { EditLog } from "./edit-log.js";
import type { DiffService } from "../../infrastructure/diff/diff-service.js";
import { applyPendingMutation } from "../../infrastructure/tools/mutation-apply.js";

export type MutationCoordinatorDeps = {
  fs: FileSystemPort;
  sessionStore: SessionStorePort;
  diffService: DiffService;
  editStore: EditStore;
  editLog: EditLog;
};

export class MutationCoordinator {
  private readonly proposeEdit: ProposeFileEditUseCase;
  private readonly applyEdit: ApplyFileEditUseCase;

  constructor(private readonly deps: MutationCoordinatorDeps) {
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

  async confirmAndApply(
    session: Session,
    args: Record<string, unknown>,
    result: AiricToolResult,
    ctx: {
      toolCallId: string;
      permissionGate?: EditPermissionGate;
      signal?: AbortSignal;
    },
    events?: ToolExecutionEvents,
  ): Promise<AiricToolResult> {
    const inputPath = String(args.path ?? "");
    const diffContent = findDiffContent(result);
    if (!diffContent) {
      throw new Error("Tool did not produce diff content for confirmation");
    }

    const permission = await this.requestPermission(
      session,
      inputPath,
      diffContent.newText,
      ctx,
      events,
    );

    if (!permission.allowed) {
      return {
        content: [
          {
            type: "text",
            text: `Change rejected by user for ${inputPath}.`,
          },
        ],
      };
    }

    const absolutePath = resolveWithinWorkspace(inputPath, session.workspaceRoot);

    if (!permission.writeDone) {
      await applyPendingMutation(absolutePath, result, ctx.signal);
    }

    session.currentDocument = absolutePath;
    session.updatedAt = new Date().toISOString();
    await this.deps.sessionStore.save(session);

    const { pendingWrite: _pending, ...details } = result.details ?? {};
    return {
      content: result.content,
      details,
    };
  }

  private async requestPermission(
    session: Session,
    inputPath: string,
    newContent: string,
    ctx: {
      toolCallId: string;
      permissionGate?: EditPermissionGate;
    },
    events?: ToolExecutionEvents,
  ): Promise<{ allowed: boolean; writeDone: boolean }> {
    const gate = events?.onProposeEdit ?? ctx.permissionGate;
    if (!gate) {
      return { allowed: true, writeDone: false };
    }

    const edit = await this.proposeEdit.execute({
      sessionId: session.id,
      path: inputPath,
      newContent,
    });

    const decision = await gate(edit, ctx.toolCallId);
    if (decision === "allow") {
      await this.applyEdit.execute(session.id, edit.id);
      return { allowed: true, writeDone: true };
    }

    this.deps.editStore.delete(edit.id);
    return { allowed: false, writeDone: false };
  }
}
