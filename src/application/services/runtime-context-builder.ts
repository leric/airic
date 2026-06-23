import type { ChatMessage } from "../../domain/session/session.js";
import type { SpecDocument } from "../../domain/spec/spec-document.js";
import type { LlmMessage } from "../ports/llm-port.js";

export type RuntimeContextInput = {
  baseInstruction: string;
  roleSpec: SpecDocument;
  chatHistory: ChatMessage[];
};

export class RuntimeContextBuilder {
  build(input: RuntimeContextInput): LlmMessage[] {
    const systemParts = [
      input.baseInstruction.trim(),
      "",
      "## Active Role",
      input.roleSpec.body.trim(),
    ];

    const messages: LlmMessage[] = [
      {
        role: "system",
        content: systemParts.join("\n"),
      },
    ];

    for (const message of input.chatHistory) {
      if (message.role === "system") {
        continue;
      }
      messages.push({
        role: message.role,
        content: message.content,
      });
    }

    return messages;
  }
}
