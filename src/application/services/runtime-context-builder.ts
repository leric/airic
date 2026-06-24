import type { SpecDocument } from "../../domain/spec/spec-document.js";
import {
  bootstrapTranscriptFromMessages,
} from "../../domain/agent/transcript.js";
import type { Session } from "../../domain/session/session.js";
import type { AgentSystemContext } from "../ports/agent-runtime-port.js";
import type { CurrentDocumentContext } from "./current-document-context.js";

export type RuntimeContextInput = {
  baseInstruction: string;
  roleSpec: SpecDocument;
  currentDocument?: CurrentDocumentContext;
};

export class RuntimeContextBuilder {
  buildSystemPrompt(input: RuntimeContextInput): string {
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

      systemParts.push(
        "",
        "```markdown",
        input.currentDocument.content.trim(),
        "```",
      );

      if (input.currentDocument.documentTypeSpec) {
        systemParts.push(
          "",
          "## Document-Type Spec",
          input.currentDocument.documentTypeSpec.body.trim(),
        );
      }
    }

    return systemParts.join("\n");
  }

  buildAgentContext(
    input: RuntimeContextInput,
    refreshCurrentDocument: () => Promise<CurrentDocumentContext | undefined>,
  ): AgentSystemContext {
    const staticPrompt = this.buildSystemPrompt(input);

    return {
      systemPrompt: staticPrompt,
      refreshSystemPrompt: async () => {
        const currentDocument = await refreshCurrentDocument();
        return this.buildSystemPrompt({
          ...input,
          currentDocument,
        });
      },
    };
  }
}

export function ensureSessionTranscript(session: Session): void {
  if (!session.transcript) {
    session.transcript = [];
  }

  if (session.transcript.length === 0 && session.messages.length > 0) {
    session.transcript = bootstrapTranscriptFromMessages(session.messages);
  }
}
