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
import type { KernelToolDefinition } from "../../application/services/kernel-tool-registry.js";
import { PiModelResolver } from "./pi-model-resolver.js";
import { extractAssistantText, fromPiMessages, toPiMessages } from "./pi-transcript-mapper.js";

const MAX_TOOL_ROUNDS = 8;

export class PiAgentRuntime implements AgentRuntimePort {
  private readonly activeAgents = new Map<string, Agent>();
  private readonly modelResolver: PiModelResolver;

  constructor(modelResolver?: PiModelResolver) {
    this.modelResolver = modelResolver ?? new PiModelResolver();
  }

  async runTurn(input: AgentTurnInput): Promise<AgentTurnResult> {
    const model = this.modelResolver.resolve(input.llm);

    const piTools = buildPiTools(input);
    const piMessages = toPiMessages(input.session.transcript, {
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
        if (toolRoundCount >= MAX_TOOL_ROUNDS) {
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
      const transcript = fromPiMessages(llmMessages);

      await input.onEvent({ type: "run_end", assistantText });

      return { assistantText, transcript };
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
    execute: async (toolCallId, params, signal) => {
      const handler = input.tools.handler(definition.name);
      if (!handler) {
        throw new Error(`Unknown tool: ${definition.name}`);
      }

      const args = params as Record<string, unknown>;
      const result = await handler(input.session, args, {
        toolCallId,
        permissionGate: input.permissionGate,
        signal,
      });

      return {
        content: [{ type: "text", text: result }],
        details: { result },
      };
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
      kind: presentation.kind,
      rawInput: presentation.rawInput,
      locations: presentation.locations,
    });
    return;
  }

  if (event.type === "tool_execution_end") {
    const text = extractToolResultText(event.result);
    await input.onEvent({
      type: "tool_call_end",
      toolCallId: event.toolCallId,
      status: event.isError ? "failed" : "completed",
      content: text,
      rawOutput: event.isError ? { error: text } : { result: text },
    });
  }
}

function isLlmMessage(message: { role: string }): message is Message {
  return (
    message.role === "user" ||
    message.role === "assistant" ||
    message.role === "toolResult"
  );
}

function extractToolResultText(result: unknown): string {
  if (!result || typeof result !== "object") {
    return "";
  }

  const content = (result as { content?: Array<{ type: string; text?: string }> })
    .content;
  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text as string)
    .join("");
}
