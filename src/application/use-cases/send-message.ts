import type { AgentRuntimePort } from "../ports/agent-runtime-port.js";
import type { FileSystemPort } from "../ports/file-system-port.js";
import type { SessionStorePort } from "../ports/session-store-port.js";
import { RuntimeContextBuilder } from "../services/runtime-context-builder.js";
import type { WorkspaceRuntime } from "../services/workspace-runtime-loader.js";
import { loadCurrentDocumentContext } from "../services/current-document-context.js";
import type { KernelToolRegistryPort } from "../services/kernel-tool-registry.js";
import {
  buildSumupPrompt,
  buildSumupSystemPrompt,
} from "../services/session-sumup-builder.js";
import type {
  AgentRuntimeEvent,
  EditPermissionGate,
} from "../ports/agent-runtime-port.js";
import { ensureSessionTree } from "../../domain/session/ensure-session-tree.js";
import { parseSessionCommand } from "../../domain/session/session-command.js";
import {
  appendTurn,
  beginDig,
  createReturnSummaryTurn,
  popDigFrame,
  projectCursorPath,
  projectDigressionPath,
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
      case "digin":
        return this.handleDigIn(session, command.topic, input);
      case "sumup":
        return this.handleSumUp(session, input);
      case "tree":
        return this.handleTree(session, input);
      default:
        return this.handleMessage(session, input.userMessage, input);
    }
  }

  private async handleMessage(
    session: Awaited<ReturnType<SessionStorePort["get"]>> & {},
    userMessage: string,
    input: SendMessageInput,
  ): Promise<string> {
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

    appendTurn(session, {
      userMessage,
      assistantMessage: result.assistantText,
      toolTrace: result.turnMessages,
    });

    session.updatedAt = new Date().toISOString();
    session.roleId = roleId;

    await this.deps.sessionStore.save(session);

    return result.assistantText;
  }

  private async handleDigIn(
    session: Awaited<ReturnType<SessionStorePort["get"]>> & {},
    topic: string | undefined,
    input: SendMessageInput,
  ): Promise<string> {
    const frame = beginDig(session, topic);

    let response: string;
    if (!frame) {
      response =
        "Cannot dig in yet: send at least one message before starting a dig-in.";
    } else if (topic) {
      response = `Digging into: ${topic}.`;
    } else {
      response = "Digging into a detail from the current turn.";
    }

    session.updatedAt = new Date().toISOString();
    await this.deps.sessionStore.save(session);
    await this.emitDirectResponse(response, input.onEvent);

    return response;
  }

  private async handleSumUp(
    session: Awaited<ReturnType<SessionStorePort["get"]>> & {},
    input: SendMessageInput,
  ): Promise<string> {
    const frame = session.digStack[session.digStack.length - 1];
    if (!frame) {
      const response = "No active dig-in to summarize. Use /digin first.";
      await this.emitDirectResponse(response, input.onEvent);
      return response;
    }

    const baseTurn = session.turns[frame.baseTurnId];
    const digressionMessages = projectDigressionPath(session, frame);
    const summaryText = await this.deps.agentRuntime.complete({
      llm: this.deps.runtime.config.llm,
      systemPrompt: buildSumupSystemPrompt(),
      messages: digressionMessages,
      prompt: buildSumupPrompt(frame, baseTurn),
      signal: input.signal,
    });

    createReturnSummaryTurn(session, frame, summaryText);
    popDigFrame(session);

    session.updatedAt = new Date().toISOString();
    await this.deps.sessionStore.save(session);
    await this.emitDirectResponse(summaryText, input.onEvent);

    return summaryText;
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
