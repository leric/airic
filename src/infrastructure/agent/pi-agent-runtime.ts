import {
  Agent,
  convertToLlm,
  type AgentEvent,
  type AgentTool,
  type StreamFn,
} from "@earendil-works/pi-agent-core";
import { Type, type Message, type TSchema } from "@earendil-works/pi-ai";
import type {
  AgentRuntimePort,
  AgentTurnInput,
  AgentTurnResult,
} from "../../application/ports/agent-runtime-port.js";
import type { AiricToolResult } from "../../domain/tool/tool-result.js";
import type { KernelToolDefinition } from "../../application/services/kernel-tool-registry.js";
import { formatToolResultText } from "../tools/common/tool-result-format.js";
import { mapToolEndEvent } from "../../interfaces/acp/acp-tool-event-mapper.js";
import { PiModelResolver } from "./pi-model-resolver.js";
import { extractAssistantText, fromPiMessages, toPiMessages } from "./pi-transcript-mapper.js";

export class PiAgentRuntime implements AgentRuntimePort {
  private readonly activeAgents = new Map<string, Agent>();
  private readonly modelResolver: PiModelResolver;

  constructor(modelResolver?: PiModelResolver) {
    this.modelResolver = modelResolver ?? new PiModelResolver();
  }

  async runTurn(input: AgentTurnInput): Promise<AgentTurnResult> {
    const model = this.modelResolver.resolve(input.llm);

    const piTools = buildPiTools(input);
    const piMessages = toPiMessages(input.priorMessages, {
      provider: model.provider,
      model: model.id,
      api: model.api,
    });

    const streamFn: StreamFn = (streamModel, context, options) =>
      this.modelResolver.streamSimple(streamModel, context, {
        ...options,
        temperature: input.llm.temperature,
        maxTokens: input.llm.maxTokens,
        reasoning:
          input.llm.thinkingLevel && input.llm.thinkingLevel !== "off"
            ? input.llm.thinkingLevel
            : undefined,
        signal: input.signal ?? options?.signal,
      });

    let toolRoundCount = 0;
    const maxToolRounds = input.llm.maxToolRounds;

    let agent!: Agent;
    agent = new Agent({
      initialState: {
        systemPrompt: input.systemContext.systemPrompt,
        model,
        thinkingLevel:
          input.llm.thinkingLevel && input.llm.thinkingLevel !== "off"
            ? input.llm.thinkingLevel
            : "off",
        tools: piTools,
        messages: piMessages,
      },
      convertToLlm,
      transformContext: async () => {
        const refreshedPrompt = await input.systemContext.refreshSystemPrompt();
        agent.state.systemPrompt = refreshedPrompt;
        return agent.state.messages;
      },
      streamFn,
      sessionId: input.sessionId,
      toolExecution: "parallel",
      afterToolCall: async () => {
        toolRoundCount += 1;
        if (toolRoundCount >= maxToolRounds) {
          return { terminate: true };
        }
        return undefined;
      },
    });

    this.activeAgents.set(input.sessionId, agent);

    const abortListener = () => {
      agent.abort();
    };
    input.signal?.addEventListener("abort", abortListener);

    const unsubscribe = agent.subscribe(async (event) => {
      await mapPiEvent(event, input);
    });

    try {
      await agent.prompt(input.userMessage);
      await agent.waitForIdle();

      const llmMessages = agent.state.messages.filter(isLlmMessage);
      const assistantText = extractAssistantText(llmMessages);
      const fullTranscript = fromPiMessages(llmMessages);
      const turnMessages = fullTranscript.slice(input.priorMessages.length);

      await input.onEvent({ type: "run_end", assistantText });

      return { assistantText, turnMessages };
    } finally {
      input.signal?.removeEventListener("abort", abortListener);
      unsubscribe();
      this.activeAgents.delete(input.sessionId);
    }
  }

  abort(sessionId: string): void {
    this.activeAgents.get(sessionId)?.abort();
  }
}

function buildPiTools(input: AgentTurnInput): AgentTool[] {
  return input.tools.definitions().map((definition) =>
    createPiTool(definition, input),
  );
}

function createPiTool(
  definition: KernelToolDefinition,
  input: AgentTurnInput,
): AgentTool {
  const parameters = jsonSchemaToTypebox(definition.parameters);

  return {
    name: definition.name,
    label: definition.name,
    description: definition.description,
    parameters,
    executionMode: definition.sequential ? "sequential" : undefined,
    execute: async (toolCallId, params, signal, onUpdate) => {
      const handler = input.tools.handler(definition.name);
      if (!handler) {
        throw new Error(`Unknown tool: ${definition.name}`);
      }

      const args = params as Record<string, unknown>;
      const result = await handler(input.session, args, {
        toolCallId,
        permissionGate: input.permissionGate,
        historyPermissionGate: input.historyPermissionGate,
        signal,
        onUpdate: onUpdate
          ? (update) =>
              onUpdate({
                content: update.content.map((part) =>
                  part.type === "text"
                    ? { type: "text" as const, text: part.text }
                    : { type: "text" as const, text: formatToolResultText({ content: [part] }) },
                ),
                details: update.details,
              })
          : undefined,
      });

      return mapAiricResultToPi(result);
    },
  };
}

function mapAiricResultToPi(result: AiricToolResult) {
  return {
    content: result.content.map((part) => {
      if (part.type === "text") {
        return { type: "text" as const, text: part.text };
      }
      if (part.type === "diff") {
        return {
          type: "text" as const,
          text: `[diff: ${part.path}]`,
        };
      }
      return { type: "text" as const, text: `[terminal: ${part.terminalId}]` };
    }),
    details: {
      ...result.details,
      // Pi Agent Core content blocks cannot carry ACP diff payloads. Preserve the
      // full AiricToolResult here so tool_call_end → ACP mapper can emit diff content.
      // See architecture-map.md → Boundary debts.
      _airicResult: result,
    },
  };
}

function jsonSchemaToTypebox(schema: Record<string, unknown>) {
  const properties = schema.properties as Record<string, Record<string, unknown>> | undefined;
  const required = (schema.required as string[] | undefined) ?? [];

  if (!properties) {
    return Type.Object({});
  }

  const shape: Record<string, TSchema> = {};
  for (const [key, property] of Object.entries(properties)) {
    const description =
      typeof property.description === "string" ? property.description : undefined;

    if (property.type === "boolean") {
      shape[key] = Type.Boolean({ description });
    } else if (property.type === "number") {
      shape[key] = Type.Number({ description });
    } else if (property.type === "array") {
      shape[key] = Type.Array(Type.Any(), { description });
    } else {
      shape[key] = Type.String({ description });
    }
  }

  return Type.Object(shape, { required });
}

async function mapPiEvent(
  event: AgentEvent,
  input: AgentTurnInput,
): Promise<void> {
  if (event.type === "message_update") {
    const assistantEvent = event.assistantMessageEvent;
    if (assistantEvent.type === "text_delta" && assistantEvent.delta) {
      await input.onEvent({ type: "text_delta", text: assistantEvent.delta });
    }
    return;
  }

  if (event.type === "tool_execution_start") {
    const presentation = input.tools.presentToolCall(
      event.toolName,
      event.args as Record<string, unknown>,
    );
    await input.onEvent({
      type: "tool_call_start",
      toolCallId: event.toolCallId,
      name: event.toolName,
      title: presentation.title,
      kind: toAgentToolKind(presentation.kind),
      rawInput: presentation.rawInput,
      locations: presentation.locations,
    });
    return;
  }

  if (event.type === "tool_execution_end") {
    const result = reconstructAiricResult(event.result);
    const endEvent = mapToolEndEvent(
      event.toolCallId,
      result,
      event.isError,
    );
    await input.onEvent(endEvent);
  }
}

function isLlmMessage(message: { role: string }): message is Message {
  return (
    message.role === "user" ||
    message.role === "assistant" ||
    message.role === "toolResult"
  );
}

function toAgentToolKind(
  kind: string,
): "read" | "edit" | "search" | "execute" | "other" {
  if (kind === "read" || kind === "edit" || kind === "search" || kind === "execute") {
    return kind;
  }
  return "other";
}

function reconstructAiricResult(result: unknown): AiricToolResult {
  if (!result || typeof result !== "object") {
    return { content: [{ type: "text", text: "" }] };
  }

  const details = (result as {
    details?: Record<string, unknown> & { _airicResult?: AiricToolResult };
  }).details;
  if (details?._airicResult) {
    const { _airicResult, ...rest } = details;
    return {
      content: _airicResult.content,
      details: rest,
    };
  }

  const content = (result as { content?: Array<{ type: string; text?: string }> }).content;
  if (Array.isArray(content)) {
    const textParts = content
      .filter((part) => part.type === "text" && typeof part.text === "string")
      .map((part) => ({ type: "text" as const, text: part.text as string }));

    if (textParts.length > 0) {
      return { content: textParts, details };
    }
  }

  return { content: [{ type: "text", text: "" }], details };
}
