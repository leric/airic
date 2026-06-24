import type { Session } from "../../domain/session/session.js";
import { resolveWithinWorkspace } from "../../domain/path/workspace-path.js";
import type { AiricToolContext } from "../../domain/tool/tool.js";
import type { AiricToolResult } from "../../domain/tool/tool-result.js";
import { KERNEL_TOOL_NAMES } from "../../domain/tool/tool-names.js";
import type { EditPermissionGate } from "../ports/agent-runtime-port.js";
import type { FileSystemPort } from "../ports/file-system-port.js";
import type { SessionStorePort } from "../ports/session-store-port.js";
import type { ToolPolicyPort } from "../ports/tool-policy-port.js";
import { AllowAllToolPolicy } from "../ports/tool-policy-port.js";
import type {
  ToolExecutionEvents,
  ToolExecutorPort,
} from "../ports/tool-executor-port.js";
import {
  ProposeFileEditUseCase,
  ApplyFileEditUseCase,
} from "../use-cases/file-editing.js";
import type { EditStore } from "./edit-store.js";
import type { EditLog } from "./edit-log.js";
import type { DiffService } from "../../infrastructure/diff/diff-service.js";
import { findDiffContent } from "../../infrastructure/tools/common/tool-result-format.js";
import {
  applyEditWrite,
  executeEditTool,
} from "../../infrastructure/tools/file/edit-tool.js";
import { executeFindTool } from "../../infrastructure/tools/file/find-tool.js";
import { executeGrepTool } from "../../infrastructure/tools/file/grep-tool.js";
import { executeLsTool } from "../../infrastructure/tools/file/ls-tool.js";
import { executeReadTool } from "../../infrastructure/tools/file/read-tool.js";
import {
  applyWrite,
  executeWriteTool,
} from "../../infrastructure/tools/file/write-tool.js";
import { executeBashTool } from "../../infrastructure/tools/shell/bash-tool.js";

export type { ToolExecutionEvents } from "../ports/tool-executor-port.js";

export type AiricToolExecutorDeps = {
  fs: FileSystemPort;
  sessionStore: SessionStorePort;
  diffService: DiffService;
  editStore: EditStore;
  editLog: EditLog;
  toolPolicy?: ToolPolicyPort;
};

const MUTATING_TOOLS = new Set<string>([
  KERNEL_TOOL_NAMES.EDIT,
  KERNEL_TOOL_NAMES.WRITE,
  KERNEL_TOOL_NAMES.BASH,
]);

export class AiricToolExecutor implements ToolExecutorPort {
  private readonly proposeEdit: ProposeFileEditUseCase;
  private readonly applyEdit: ApplyFileEditUseCase;
  private readonly toolPolicy: ToolPolicyPort;

  constructor(private readonly deps: AiricToolExecutorDeps) {
    this.toolPolicy = deps.toolPolicy ?? new AllowAllToolPolicy();
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
    toolName: string,
    args: Record<string, unknown>,
    ctx: {
      toolCallId: string;
      permissionGate?: EditPermissionGate;
      signal?: AbortSignal;
      onUpdate?: (update: AiricToolResult) => void;
    },
    events?: ToolExecutionEvents,
  ): Promise<AiricToolResult> {
    const context: AiricToolContext = {
      cwd: session.workspaceRoot,
      sessionId: session.id,
    };

    if (MUTATING_TOOLS.has(toolName)) {
      const decision = await this.toolPolicy.check({
        toolName,
        kind: toolName === KERNEL_TOOL_NAMES.BASH ? "execute" : "edit",
        args,
        sessionId: session.id,
        cwd: session.workspaceRoot,
      });

      if (decision.kind === "deny") {
        throw new Error(decision.reason);
      }
    }

    let result: AiricToolResult;

    switch (toolName) {
      case KERNEL_TOOL_NAMES.READ:
        result = await executeReadTool(
          args as { path: string; offset?: number; limit?: number },
          context,
          ctx.signal,
        );
        break;
      case KERNEL_TOOL_NAMES.LS:
        result = await executeLsTool(
          args as { path?: string },
          context,
        );
        break;
      case KERNEL_TOOL_NAMES.FIND:
        result = await executeFindTool(
          args as { pattern: string; path?: string; limit?: number },
          context,
          ctx.signal,
        );
        break;
      case KERNEL_TOOL_NAMES.GREP:
        result = await executeGrepTool(
          args as {
            pattern: string;
            path?: string;
            glob?: string;
            ignoreCase?: boolean;
            literal?: boolean;
            context?: number;
            limit?: number;
          },
          context,
          ctx.signal,
          { fs: this.deps.fs },
        );
        break;
      case KERNEL_TOOL_NAMES.EDIT:
        result = await this.executeMutatingEdit(session, args, ctx, events);
        break;
      case KERNEL_TOOL_NAMES.WRITE:
        result = await this.executeMutatingWrite(session, args, ctx, events);
        break;
      case KERNEL_TOOL_NAMES.BASH:
        result = await executeBashTool(
          args as { command: string; timeout?: number },
          context,
          ctx.signal,
          ctx.onUpdate
            ? (update) => ctx.onUpdate!({ content: update.content, details: update.details })
            : undefined,
        );
        break;
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }

    return result;
  }

  private async executeMutatingEdit(
    session: Session,
    args: Record<string, unknown>,
    ctx: {
      toolCallId: string;
      permissionGate?: EditPermissionGate;
      signal?: AbortSignal;
    },
    events?: ToolExecutionEvents,
  ): Promise<AiricToolResult> {
    const inputPath = String(args.path ?? "");
    const context: AiricToolContext = {
      cwd: session.workspaceRoot,
      sessionId: session.id,
    };

    const result = await executeEditTool(args, context, ctx.signal);
    const diffContent = findDiffContent(result);
    if (!diffContent) {
      throw new Error("Edit tool did not produce diff content");
    }

    const allowed = await this.requestMutationPermission(
      session,
      inputPath,
      diffContent.oldText ?? "",
      diffContent.newText,
      ctx,
      events,
    );

    if (!allowed) {
      return {
        content: [
          {
            type: "text",
            text: `Edit rejected by user for ${inputPath}.`,
          },
        ],
      };
    }

    const absolutePath = resolveWithinWorkspace(inputPath, session.workspaceRoot);
    await applyEditWrite(result, absolutePath, ctx.signal);

    session.currentDocument = absolutePath;
    session.updatedAt = new Date().toISOString();
    await this.deps.sessionStore.save(session);

    const { pendingWrite: _pending, ...details } = result.details ?? {};
    return {
      content: result.content,
      details,
    };
  }

  private async executeMutatingWrite(
    session: Session,
    args: Record<string, unknown>,
    ctx: {
      toolCallId: string;
      permissionGate?: EditPermissionGate;
      signal?: AbortSignal;
    },
    events?: ToolExecutionEvents,
  ): Promise<AiricToolResult> {
    const inputPath = String(args.path ?? "");
    const content = String(args.content ?? "");
    const context: AiricToolContext = {
      cwd: session.workspaceRoot,
      sessionId: session.id,
    };

    const result = await executeWriteTool({ path: inputPath, content }, context, ctx.signal);
    const diffContent = findDiffContent(result);
    if (!diffContent) {
      throw new Error("Write tool did not produce diff content");
    }

    const allowed = await this.requestMutationPermission(
      session,
      inputPath,
      diffContent.oldText ?? "",
      diffContent.newText,
      ctx,
      events,
    );

    if (!allowed) {
      return {
        content: [
          {
            type: "text",
            text: `Write rejected by user for ${inputPath}.`,
          },
        ],
      };
    }

    const absolutePath = resolveWithinWorkspace(inputPath, session.workspaceRoot);
    await applyWrite(result, absolutePath, ctx.signal);

    session.currentDocument = absolutePath;
    session.updatedAt = new Date().toISOString();
    await this.deps.sessionStore.save(session);

    const { pendingWrite: _pending, ...details } = result.details ?? {};
    return {
      content: result.content,
      details,
    };
  }

  private async requestMutationPermission(
    session: Session,
    inputPath: string,
    _originalContent: string,
    newContent: string,
    ctx: {
      toolCallId: string;
      permissionGate?: EditPermissionGate;
    },
    events?: ToolExecutionEvents,
  ): Promise<boolean> {
    const gate = events?.onProposeEdit ?? ctx.permissionGate;
    if (!gate) {
      return true;
    }

    const edit = await this.proposeEdit.execute({
      sessionId: session.id,
      path: inputPath,
      newContent,
    });

    const decision = await gate(edit, ctx.toolCallId);
    if (decision === "allow") {
      await this.applyEdit.execute(session.id, edit.id);
      return true;
    }

    this.deps.editStore.delete(edit.id);
    return false;
  }
}
