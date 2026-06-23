import type { LlmPort } from "../ports/llm-port.js";
import type { SessionStorePort } from "../ports/session-store-port.js";
import { RuntimeContextBuilder } from "../services/runtime-context-builder.js";
import type { WorkspaceRuntime } from "../services/workspace-runtime-loader.js";

export type StreamCallback = (chunk: string) => Promise<void>;

export type SendMessageInput = {
  sessionId: string;
  userMessage: string;
  signal?: AbortSignal;
  onChunk: StreamCallback;
};

export type SendMessageDeps = {
  sessionStore: SessionStorePort;
  llm: LlmPort;
  runtime: WorkspaceRuntime;
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

    const roleId = session.roleId ?? this.deps.runtime.config.defaultRole;
    const roleSpec = this.deps.runtime.specRegistry.require(roleId);

    session.messages.push({ role: "user", content: input.userMessage });

    const llmMessages = this.contextBuilder.build({
      baseInstruction: this.deps.runtime.baseInstruction,
      roleSpec,
      chatHistory: session.messages,
    });

    let assistantText = "";

    for await (const chunk of this.deps.llm.streamChat(llmMessages, {
      signal: input.signal,
    })) {
      if (chunk.type === "text") {
        assistantText += chunk.text;
        await input.onChunk(chunk.text);
      }
    }

    session.messages.push({ role: "assistant", content: assistantText });
    session.updatedAt = new Date().toISOString();
    session.roleId = roleId;

    await this.deps.sessionStore.save(session);

    return assistantText;
  }
}
