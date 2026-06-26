import type { AgentRuntimePort } from "../ports/agent-runtime-port.js";
import type { FileSystemPort } from "../ports/file-system-port.js";
import type { SessionStorePort } from "../ports/session-store-port.js";
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
} from "../ports/agent-runtime-port.js";
import { ensureSessionTree } from "../../domain/session/ensure-session-tree.js";
import { parseSessionCommand } from "../../domain/session/session-command.js";
import type { SessionCommand } from "../../domain/session/session-command.js";
import type { Session } from "../../domain/session/session.js";
import {
  appendTurn,
  projectCursorPath,
  renderTree,
} from "../../domain/session/turn-tree.js";

export type SendMessageInput = {
  sessionId: string;
  userMessage: string;
  signal?: AbortSignal;
  onEvent: (event: AgentRuntimeEvent) => Promise<void>;
  permissionGate?: EditPermissionGate;
};

export type SendMessageDeps = {
  sessionStore: SessionStorePort;
  agentRuntime: AgentRuntimePort;
  runtime: WorkspaceRuntime;
  fs: FileSystemPort;
  kernelTools: KernelToolRegistryPort;
  contextBuilder?: RuntimeContextBuilder;
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

    const priorMessages = projectCursorPath(session);

    const result = await this.deps.agentRuntime.runTurn({
      sessionId: input.sessionId,
      userMessage,
      priorMessages,
      llm: this.deps.runtime.config.llm,
      systemContext,
      session,
      tools: this.deps.kernelTools,
      permissionGate: input.permissionGate,
      signal: input.signal,
      onEvent: input.onEvent,
    });

    const reloaded = await this.deps.sessionStore.get(input.sessionId);
    if (reloaded) {
      // process.* tools load-mutate-save via sessionStore; merge before appendTurn save.
      mergeProcessState(session, reloaded);
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
    session: Awaited<ReturnType<SessionStorePort["get"]>> & {},
    input: SendMessageInput,
  ): Promise<string> {
    const response = renderTree(session);
    await this.emitDirectResponse(response, input.onEvent);
    return response;
  }

  private async emitDirectResponse(
    text: string,
    onEvent: (event: AgentRuntimeEvent) => Promise<void>,
  ): Promise<void> {
    await onEvent({ type: "text_delta", text });
    await onEvent({ type: "run_end", assistantText: text });
  }
}
