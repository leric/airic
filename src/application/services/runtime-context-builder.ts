import type { ChatMessage } from "../../domain/session/session.js";
import type { SpecDocument } from "../../domain/spec/spec-document.js";
import type { LlmMessage } from "../ports/llm-port.js";
import type { CurrentDocumentContext } from "./current-document-context.js";

export type RuntimeContextInput = {
  baseInstruction: string;
  roleSpec: SpecDocument;
  chatHistory: ChatMessage[];
  currentDocument?: CurrentDocumentContext;
};

export class RuntimeContextBuilder {
  build(input: RuntimeContextInput): LlmMessage[] {
    const systemParts = [
      input.baseInstruction.trim(),
      "",
      "## Active Role",
      input.roleSpec.body.trim(),
    ];

    if (input.currentDocument) {
      systemParts.push(
        "",
        "## Current Document",
        `Path: ${input.currentDocument.relativePath}`,
      );

      if (input.currentDocument.docType) {
        systemParts.push(`doc_type: ${input.currentDocument.docType}`);
      }

      systemParts.push("", "```markdown", input.currentDocument.content.trim(), "```");

      if (input.currentDocument.documentTypeSpec) {
        systemParts.push(
          "",
          "## Document-Type Spec",
          input.currentDocument.documentTypeSpec.body.trim(),
        );
      }
    }

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
