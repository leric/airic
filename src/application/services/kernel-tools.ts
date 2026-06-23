import type { LlmToolDefinition } from "../ports/llm-port.js";
import { KERNEL_TOOL_NAMES } from "../../domain/tool/tool-names.js";

export const KERNEL_TOOL_DEFINITIONS: LlmToolDefinition[] = [
  {
    name: KERNEL_TOOL_NAMES.LIST_FILES,
    description: "List files and directories at a path relative to the workspace root.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Directory path relative to workspace root. Use '.' for root.",
        },
      },
      required: ["path"],
    },
  },
  {
    name: KERNEL_TOOL_NAMES.READ_FILE,
    description: "Read the full text content of a file.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File path relative to workspace root.",
        },
      },
      required: ["path"],
    },
  },
  {
    name: KERNEL_TOOL_NAMES.CREATE_FILE,
    description:
      "Create a new file with the given content. Creates parent directories if needed.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File path relative to workspace root.",
        },
        content: {
          type: "string",
          description: "Full file content to write.",
        },
        set_current_document: {
          type: "boolean",
          description:
            "When true, set this file as the session current document after creation.",
        },
      },
      required: ["path", "content"],
    },
  },
  {
    name: KERNEL_TOOL_NAMES.PROPOSE_EDIT,
    description:
      "Propose a file edit by providing the complete new file content. The user must accept before the file is written.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "File path relative to workspace root.",
        },
        content: {
          type: "string",
          description: "Complete proposed file content after the edit.",
        },
      },
      required: ["path", "content"],
    },
  },
  {
    name: KERNEL_TOOL_NAMES.SEARCH_TEXT,
    description: "Search for text in workspace files.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Text to search for.",
        },
        path: {
          type: "string",
          description: "Optional directory to search within, relative to workspace root.",
        },
      },
      required: ["query"],
    },
  },
];
