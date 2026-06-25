import type { SpecDocument } from "../../domain/spec/spec-document.js";
import type { AgentSystemContext } from "../ports/agent-runtime-port.js";
import type { CurrentDocumentContext } from "./current-document-context.js";

export type RuntimeContextInput = {
  baseInstruction: string;
  modeSpec: SpecDocument;
  processIndex: string;
  activeProcessSpec?: SpecDocument;
  currentDocument?: CurrentDocumentContext;
};

export class RuntimeContextBuilder {
  /** Builds the system prompt only. Message history context is `projectCursorPath()` in `domain/session/turn-tree.ts`. */
  buildSystemPrompt(input: RuntimeContextInput): string {
    const systemParts = [
      input.baseInstruction.trim(),
      "",
      "## Active Mode",
      input.modeSpec.body.trim(),
    ];

    if (input.activeProcessSpec) {
      systemParts.push(
        "",
        "## Active Process",
        input.activeProcessSpec.body.trim(),
      );
    } else if (input.processIndex.trim().length > 0) {
      systemParts.push(
        "",
        "## Available Processes",
        input.processIndex.trim(),
      );
    }

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
