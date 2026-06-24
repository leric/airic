import type { Session } from "../../domain/session/session.js";
import { KERNEL_TOOL_NAMES } from "../../domain/tool/tool-names.js";
import type { EditPermissionGate } from "../ports/agent-runtime-port.js";
import type { FileToolExecutor } from "./file-tool-executor.js";

export type KernelToolHandler = (
  session: Session,
  args: Record<string, unknown>,
  ctx: {
    toolCallId: string;
    permissionGate?: EditPermissionGate;
    signal?: AbortSignal;
  },
) => Promise<string>;

export type KernelToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  kind: "read" | "edit" | "search" | "other";
  sequential?: boolean;
};

export type ToolCallPresentation = {
  title: string;
  kind: "read" | "edit" | "search" | "other";
  rawInput: Record<string, unknown>;
  locations?: Array<{ path: string }>;
};

export interface KernelToolRegistryPort {
  definitions(): KernelToolDefinition[];
  handler(name: string): KernelToolHandler | undefined;
  presentToolCall(
    name: string,
    args: Record<string, unknown>,
  ): ToolCallPresentation;
}

const KERNEL_TOOL_DEFINITIONS: KernelToolDefinition[] = [
  {
    name: KERNEL_TOOL_NAMES.LIST_FILES,
    description:
      "List files and directories at a path relative to the workspace root.",
    kind: "read",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description:
            "Directory path relative to workspace root. Use '.' for root.",
        },
      },
      required: ["path"],
    },
  },
  {
    name: KERNEL_TOOL_NAMES.READ_FILE,
    description: "Read the full text content of a file.",
    kind: "read",
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
    kind: "edit",
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
    kind: "edit",
    sequential: true,
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
    kind: "search",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Text to search for.",
        },
        path: {
          type: "string",
          description:
            "Optional directory to search within, relative to workspace root.",
        },
      },
      required: ["query"],
    },
  },
];

export class KernelToolRegistry implements KernelToolRegistryPort {
  constructor(private readonly executor: FileToolExecutor) {}

  definitions(): KernelToolDefinition[] {
    return KERNEL_TOOL_DEFINITIONS;
  }

  handler(name: string): KernelToolHandler | undefined {
    if (!KERNEL_TOOL_DEFINITIONS.some((tool) => tool.name === name)) {
      return undefined;
    }

    return async (session, args, ctx) => {
      return this.executor.execute(session, {
        id: ctx.toolCallId,
        name,
        arguments: JSON.stringify(args),
      }, {
        onProposeEdit: async (edit, toolCallId) => {
          if (!ctx.permissionGate) {
            return "reject";
          }
          return ctx.permissionGate(edit, toolCallId);
        },
      });
    };
  }

  presentToolCall(
    name: string,
    args: Record<string, unknown>,
  ): ToolCallPresentation {
    const definition = KERNEL_TOOL_DEFINITIONS.find((tool) => tool.name === name);
    const path = typeof args.path === "string" ? args.path : undefined;

    switch (name) {
      case KERNEL_TOOL_NAMES.LIST_FILES:
        return {
          title: `List files in ${path ?? "."}`,
          kind: "read",
          rawInput: args,
          locations: path ? [{ path }] : undefined,
        };
      case KERNEL_TOOL_NAMES.READ_FILE:
        return {
          title: `Read ${path ?? "file"}`,
          kind: "read",
          rawInput: args,
          locations: path ? [{ path }] : undefined,
        };
      case KERNEL_TOOL_NAMES.CREATE_FILE:
        return {
          title: `Create ${path ?? "file"}`,
          kind: "edit",
          rawInput: args,
          locations: path ? [{ path }] : undefined,
        };
      case KERNEL_TOOL_NAMES.PROPOSE_EDIT:
        return {
          title: `Edit ${path ?? "file"}`,
          kind: "edit",
          rawInput: args,
          locations: path ? [{ path }] : undefined,
        };
      case KERNEL_TOOL_NAMES.SEARCH_TEXT:
        return {
          title: `Search for "${String(args.query ?? "")}"`,
          kind: "search",
          rawInput: args,
        };
      default:
        return {
          title: name,
          kind: definition?.kind ?? "other",
          rawInput: args,
        };
    }
  }
}
