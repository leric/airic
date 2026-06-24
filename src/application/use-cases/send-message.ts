import { projectChatSummary } from "../../domain/agent/transcript.js";
import type { AgentRuntimePort } from "../ports/agent-runtime-port.js";
import type { FileSystemPort } from "../ports/file-system-port.js";
import type { SessionStorePort } from "../ports/session-store-port.js";
import {
  RuntimeContextBuilder,
  ensureSessionTranscript,
} from "../services/runtime-context-builder.js";
import type { WorkspaceRuntime } from "../services/workspace-runtime-loader.js";
import { loadCurrentDocumentContext } from "../services/current-document-context.js";
import { FileToolExecutor } from "../services/file-tool-executor.js";
import {
  KernelToolRegistry,
} from "../services/kernel-tool-registry.js";
import type { EditStore } from "../services/edit-store.js";
import type { EditLog } from "../services/edit-log.js";
import { DiffService } from "../../infrastructure/diff/diff-service.js";
import type {
  AgentRuntimeEvent,
  EditPermissionGate,
} from "../ports/agent-runtime-port.js";

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
  editStore: EditStore;
  editLog: EditLog;
  kernelTools?: KernelToolRegistry;
  contextBuilder?: RuntimeContextBuilder;
};

export class SendMessageUseCase {
  private readonly contextBuilder: RuntimeContextBuilder;
  private readonly kernelTools: KernelToolRegistry;

  constructor(private readonly deps: SendMessageDeps) {
    this.contextBuilder = deps.contextBuilder ?? new RuntimeContextBuilder();
    this.kernelTools =
      deps.kernelTools ??
      new KernelToolRegistry(
        new FileToolExecutor({
          fs: deps.fs,
          sessionStore: deps.sessionStore,
          diffService: new DiffService(),
          editStore: deps.editStore,
          editLog: deps.editLog,
        }),
      );
  }

  async execute(input: SendMessageInput): Promise<string> {
    const session = await this.deps.sessionStore.get(input.sessionId);
    if (!session) {
      throw new Error(`Session not found: ${input.sessionId}`);
    }

    ensureSessionTranscript(session);

    const roleId = session.roleId ?? this.deps.runtime.config.defaultRole;
    const roleSpec = this.deps.runtime.specRegistry.require(roleId);

    const refreshCurrentDocument = async () =>
      loadCurrentDocumentContext(
        this.deps.fs,
        session,
        this.deps.runtime.specRegistry,
      );

    const currentDocument = await refreshCurrentDocument();
    const systemContext = this.contextBuilder.buildAgentContext(
      {
        baseInstruction: this.deps.runtime.baseInstruction,
        roleSpec,
        currentDocument,
      },
      refreshCurrentDocument,
    );

    const result = await this.deps.agentRuntime.runTurn({
      sessionId: input.sessionId,
      userMessage: input.userMessage,
      llm: this.deps.runtime.config.llm,
      systemContext,
      session,
      tools: this.kernelTools,
      permissionGate: input.permissionGate,
      signal: input.signal,
      onEvent: input.onEvent,
    });

    session.transcript = result.transcript;
    session.messages = projectChatSummary(result.transcript);
    session.updatedAt = new Date().toISOString();
    session.roleId = roleId;

    await this.deps.sessionStore.save(session);

    return result.assistantText;
  }
}
