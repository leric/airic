import type { AiricToolDefinition } from "../../../domain/tool/tool.js";
import { KERNEL_TOOL_NAMES } from "../../../domain/tool/tool-names.js";
import { textToolResult } from "../../../domain/tool/tool-result.js";
import {
  clearActiveDocument,
  setActiveDocument,
} from "../../../application/services/document-focus.js";
import type { DocumentToolDeps } from "./document-tool-deps.js";
import { loadSessionForDocumentTool } from "./document-tool-deps.js";

const SCHEMA = {
  type: "object",
  properties: {
    path: {
      type: "string",
      description:
        "Workspace-relative path to focus. Omit or empty to clear focus.",
    },
  },
};

export function createDocumentFocusTool(
  deps: DocumentToolDeps,
): AiricToolDefinition {
  return {
    name: KERNEL_TOOL_NAMES.DOCUMENT_FOCUS,
    kind: "other",
    description:
      "Set or clear the session's focused document so its doc_type spec loads into agent context.",
    inputSchema: SCHEMA,
    policy: "none",
    confirmation: "none",
    execute: async (input, context) => {
      const session = await loadSessionForDocumentTool(deps, context.sessionId);
      const path = typeof input.path === "string" ? input.path.trim() : "";

      if (!path) {
        clearActiveDocument(session);
        await deps.sessionStore.save(session);
        const output = { active: false as const };
        return textToolResult(JSON.stringify(output, null, 2), output);
      }

      const result = await setActiveDocument(
        deps.fs,
        session,
        deps.specRegistry,
        path,
      );
      await deps.sessionStore.save(session);

      const output = {
        active: true as const,
        path: result.relativePath,
        docType: result.docType,
      };
      return textToolResult(JSON.stringify(output, null, 2), output);
    },
  };
}
