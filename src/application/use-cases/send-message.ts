import type { AgentRuntimePort } from "../ports/agent-runtime-port.js";
import type { FileSystemPort } from "../ports/file-system-port.js";
import type { SessionStorePort } from "../ports/session-store-port.js";
import type { SummarizationPort } from "../ports/summarization-port.js";
import { RuntimeContextBuilder } from "../services/runtime-context-builder.js";
import type { WorkspaceRuntime } from "../services/workspace-runtime-loader.js";
import { loadCurrentDocumentContext } from "../services/current-document-context.js";
import type { KernelToolRegistryPort } from "../services/kernel-tool-registry.js";
import {
  buildProcessIndexText,
  formatProcessListForUser,
  listProcesses,
} from "../services/process-catalog.js";
import { buildToolUsageText } from "../services/tool-usage-catalog.js";
import {
  ProcessLifecycleError,
  cancelProcess,
  completeProcess,
  formatProcessStatusForUser,
  getActiveProcessInstance,
  getProcessStatus,
  mergeProcessState,
  startProcess,
} from "../services/process-lifecycle.js";
import type {
  AgentRuntimeEvent,
  EditPermissionGate,
  HistoryPermissionGate,
} from "../ports/agent-runtime-port.js";
import { parseAnchorText } from "../../domain/session/anchor.js";
import { ensureSessionTree } from "../../domain/session/ensure-session-tree.js";
import { parseSessionCommand } from "../../domain/session/session-command.js";
import type { SessionCommand } from "../../domain/session/session-command.js";
import type { Session } from "../../domain/session/session.js";
import { appendTurn, projectCursorPath } from "../../domain/session/turn-tree.js";
import type { CompactToolTraceOptions } from "../../domain/session/compact-tool-trace.js";
import {
  AnchorError,
  applyHistoryChange,
  buildMarkProposal,
  buildSummarizeProposal,
  formatAnchorError,
  formatReadTree,
  HistoryLifecycleError,
  mergeHistoryState,
  moveCursor,
} from "../services/history-lifecycle.js";
import type { HistoryAuditLog } from "../services/history-audit-log.js";

export type SendMessageInput = {
  sessionId: string;
  userMessage: string;
  signal?: AbortSignal;
  onEvent: (event: AgentRuntimeEvent) => Promise<void>;
  permissionGate?: EditPermissionGate;
  historyPermissionGate?: HistoryPermissionGate;
};

export type SendMessageDeps = {
  sessionStore: SessionStorePort;
  agentRuntime: AgentRuntimePort;
  runtime: WorkspaceRuntime;
  fs: FileSystemPort;
  kernelTools: KernelToolRegistryPort;
  contextBuilder?: RuntimeContextBuilder;
  summarizationPort?: SummarizationPort;
  historyAuditLog?: HistoryAuditLog;
};

export class SendMessageUseCase {
  private readonly contextBuilder: RuntimeContextBuilder;

  constructor(private readonly deps: SendMessageDeps) {
    this.contextBuilder = deps.contextBuilder ?? new RuntimeContextBuilder();
  }

  async execute(input: SendMessageInput): Promise<string> {
    const session = await this.deps.sessionStore.get(input.sessionId);
    if (!session) {
      throw new Error(`Session not found: ${input.sessionId}`);
    }

    ensureSessionTree(session);

    const command = parseSessionCommand(input.userMessage);

    switch (command.kind) {
      case "tree":
        return this.handleTree(session, input);
      case "cursor":
        return this.handleHistoryCursor(session, command, input);
      case "summarize":
        return this.handleHistorySummarize(session, command, input);
      case "mark":
        return this.handleHistoryMark(session, command, input);
      case "process":
        return this.handleProcess(session, command, input);
      default:
        return this.handleMessage(session, input.userMessage, input);
    }
  }

  private async handleMessage(
    session: Session,
    userMessage: string,
    input: SendMessageInput,
  ): Promise<string> {
    const modeId = session.modeId ?? this.deps.runtime.config.defaultMode;
    const modeSpec = this.deps.runtime.specRegistry.require(modeId);
    const processContext = this.buildProcessContext(session);

    const refreshCurrentDocument = async () =>
      loadCurrentDocumentContext(
        this.deps.fs,
        session,
        this.deps.runtime.specRegistry,
      );

    const currentDocument = await refreshCurrentDocument();
    const toolUsage = buildToolUsageText(this.deps.runtime.specRegistry);
    const systemContext = this.contextBuilder.buildAgentContext(
      {
        baseInstruction: this.deps.runtime.baseInstruction,
        modeSpec,
        processIndex: processContext.processIndex,
        activeProcessSpec: processContext.activeProcessSpec,
        toolUsage,
        currentDocument,
      },
      refreshCurrentDocument,
    );

    const projectionOptions: CompactToolTraceOptions = {
      describeCall: (name, args) =>
        this.deps.kernelTools.presentToolCall(name, args).title,
    };

    const priorMessages = projectCursorPath(session, projectionOptions);

    const result = await this.deps.agentRuntime.runTurn({
      sessionId: input.sessionId,
      userMessage,
      priorMessages,
      llm: this.deps.runtime.config.llm,
      systemContext,
      session,
      tools: this.deps.kernelTools,
      permissionGate: input.permissionGate,
      historyPermissionGate: input.historyPermissionGate,
      signal: input.signal,
      onEvent: input.onEvent,
    });

    const reloaded = await this.deps.sessionStore.get(input.sessionId);
    if (reloaded) {
      mergeProcessState(session, reloaded);
      mergeHistoryState(session, reloaded);
    }

    appendTurn(session, {
      userMessage,
      assistantMessage: result.assistantText,
      toolTrace: result.turnMessages,
    });

    session.updatedAt = new Date().toISOString();
    session.modeId = modeId;

    await this.deps.sessionStore.save(session);

    return result.assistantText;
  }

  private buildProcessContext(session: Session) {
    const activeInstance = getActiveProcessInstance(session);
    const processes = listProcesses(this.deps.runtime.specRegistry);

    if (activeInstance) {
      const activeProcessSpec = this.deps.runtime.specRegistry.get(
        activeInstance.processId,
      );
      return {
        processIndex: "",
        activeProcessSpec,
      };
    }

    return {
      processIndex: buildProcessIndexText(processes),
      activeProcessSpec: undefined,
    };
  }

  private async handleProcess(
    session: Session,
    command: Extract<SessionCommand, { kind: "process" }>,
    input: SendMessageInput,
  ): Promise<string> {
    let response: string;

    try {
      switch (command.action) {
        case "list": {
          const processes = listProcesses(this.deps.runtime.specRegistry);
          response = formatProcessListForUser(processes);
          break;
        }
        case "start": {
          if (!command.processId) {
            response = "Usage: /process start <process-id>";
            break;
          }
          const { instance, spec } = startProcess(
            session,
            this.deps.runtime.specRegistry,
            {
              processId: command.processId,
              startedBy: "user",
              reason: "User requested process start.",
            },
          );
          const title =
            typeof spec.frontmatter.title === "string"
              ? spec.frontmatter.title
              : spec.id;
          response = `Started process: ${instance.processId} (${title}).`;
          break;
        }
        case "status": {
          response = formatProcessStatusForUser(
            getProcessStatus(session, this.deps.runtime.specRegistry),
          );
          break;
        }
        case "complete": {
          const instance = completeProcess(
            session,
            this.deps.runtime.specRegistry,
            {
              outputSummary:
                command.outputSummary ?? "Process completed by user.",
            },
          );
          response = `Completed process: ${instance.processId}.`;
          break;
        }
        case "cancel": {
          const instance = cancelProcess(session, {
            reason: command.reason ?? "User cancelled.",
          });
          response = `Cancelled process: ${instance.processId}.`;
          break;
        }
      }
    } catch (error) {
      response =
        error instanceof ProcessLifecycleError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Process command failed.";
    }

    session.updatedAt = new Date().toISOString();
    await this.deps.sessionStore.save(session);
    await this.emitDirectResponse(response, input.onEvent);

    return response;
  }

  private async handleTree(
    session: Session,
    input: SendMessageInput,
  ): Promise<string> {
    const response = formatReadTree(session);
    await this.emitDirectResponse(response, input.onEvent);
    return response;
  }

  private async handleHistoryCursor(
    session: Session,
    command: Extract<SessionCommand, { kind: "cursor" }>,
    input: SendMessageInput,
  ): Promise<string> {
    let response: string;

    try {
      const anchor = parseAnchorText(command.anchorText);
      if (!anchor) {
        response = "Usage: /cursor <anchor>";
      } else {
        const node = moveCursor(session, anchor);
        session.updatedAt = new Date().toISOString();
        await this.deps.sessionStore.save(session);
        await this.appendHistoryAudit(session.id, "move_cursor", [node.id], {
          anchor: command.anchorText,
        });
        response = `Cursor moved to ${node.title} (${node.id.slice(0, 8)}).`;
      }
    } catch (error) {
      response =
        error instanceof AnchorError
          ? formatAnchorError(error)
          : error instanceof Error
            ? error.message
            : "Cursor command failed.";
    }

    await this.emitDirectResponse(response, input.onEvent);
    return response;
  }

  private async handleHistorySummarize(
    session: Session,
    command: Extract<SessionCommand, { kind: "summarize" }>,
    input: SendMessageInput,
  ): Promise<string> {
    let response: string;

    try {
      if (!this.deps.summarizationPort) {
        throw new HistoryLifecycleError("Summarization is not configured.");
      }
      if (!command.prompt) {
        response = "Usage: /summarize <prompt>";
      } else {
        const proposal = await buildSummarizeProposal(
          session,
          { prompt: command.prompt, moveCursor: true },
          this.deps.summarizationPort,
          this.deps.runtime.config.llm,
          input.signal,
        );
        applyHistoryChange(session, proposal.applyPayload);
        session.updatedAt = new Date().toISOString();
        await this.deps.sessionStore.save(session);
        await this.appendHistoryAudit(session.id, "summarize", proposal.resolvedNodeIds, {
          prompt: command.prompt,
        });
        response = proposal.previewText;
      }
    } catch (error) {
      response =
        error instanceof AnchorError
          ? formatAnchorError(error)
          : error instanceof HistoryLifecycleError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Summarize command failed.";
    }

    await this.emitDirectResponse(response, input.onEvent);
    return response;
  }

  private async handleHistoryMark(
    session: Session,
    command: Extract<SessionCommand, { kind: "mark" }>,
    input: SendMessageInput,
  ): Promise<string> {
    let response: string;

    try {
      if (!command.name) {
        response = "Usage: /mark <name>";
      } else {
        const proposal = buildMarkProposal(session, { name: command.name });
        applyHistoryChange(session, proposal.applyPayload);
        session.updatedAt = new Date().toISOString();
        await this.deps.sessionStore.save(session);
        await this.appendHistoryAudit(session.id, "mark", proposal.resolvedNodeIds, {
          name: command.name,
        });
        response = proposal.previewText;
      }
    } catch (error) {
      response =
        error instanceof AnchorError
          ? formatAnchorError(error)
          : error instanceof HistoryLifecycleError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Mark command failed.";
    }

    await this.emitDirectResponse(response, input.onEvent);
    return response;
  }

  private async appendHistoryAudit(
    sessionId: string,
    action: "move_cursor" | "summarize" | "mark",
    resolvedNodes: string[],
    params: Record<string, unknown>,
  ): Promise<void> {
    if (!this.deps.historyAuditLog) {
      return;
    }

    await this.deps.historyAuditLog.append({
      timestamp: new Date().toISOString(),
      sessionId,
      action,
      initiatedBy: "user",
      params,
      resolvedNodes,
    });
  }

  private async emitDirectResponse(
    text: string,
    onEvent: (event: AgentRuntimeEvent) => Promise<void>,
  ): Promise<void> {
    await onEvent({ type: "text_delta", text });
    await onEvent({ type: "run_end", assistantText: text });
  }
}
