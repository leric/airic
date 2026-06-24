import type { Session } from "../../domain/session/session.js";
import { KERNEL_TOOL_NAMES } from "../../domain/tool/tool-names.js";
import type { AiricToolResult } from "../../domain/tool/tool-result.js";
import type { EditPermissionGate } from "../ports/agent-runtime-port.js";
import type { AiricToolExecutor } from "./airic-tool-executor.js";
import {
  BASH_TOOL_DESCRIPTION,
  BASH_TOOL_SCHEMA,
} from "../../infrastructure/tools/shell/bash-tool.js";
import {
  EDIT_TOOL_DESCRIPTION,
  EDIT_TOOL_SCHEMA,
} from "../../infrastructure/tools/file/edit-tool.js";
import {
  FIND_TOOL_DESCRIPTION,
  FIND_TOOL_SCHEMA,
} from "../../infrastructure/tools/file/find-tool.js";
import {
  GREP_TOOL_DESCRIPTION,
  GREP_TOOL_SCHEMA,
} from "../../infrastructure/tools/file/grep-tool.js";
import {
  LS_TOOL_DESCRIPTION,
  LS_TOOL_SCHEMA,
} from "../../infrastructure/tools/file/ls-tool.js";
import {
  READ_TOOL_DESCRIPTION,
  READ_TOOL_SCHEMA,
} from "../../infrastructure/tools/file/read-tool.js";
import {
  WRITE_TOOL_DESCRIPTION,
  WRITE_TOOL_SCHEMA,
} from "../../infrastructure/tools/file/write-tool.js";

export type KernelToolHandler = (
  session: Session,
  args: Record<string, unknown>,
  ctx: {
    toolCallId: string;
    permissionGate?: EditPermissionGate;
    signal?: AbortSignal;
    onUpdate?: (update: AiricToolResult) => void;
  },
) => Promise<AiricToolResult>;

export type KernelToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  kind: "read" | "edit" | "search" | "execute" | "other";
  sequential?: boolean;
};

export type ToolCallPresentation = {
  title: string;
  kind: "read" | "edit" | "search" | "execute" | "other";
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
    name: KERNEL_TOOL_NAMES.READ,
    description: READ_TOOL_DESCRIPTION,
    kind: "read",
    parameters: READ_TOOL_SCHEMA,
  },
  {
    name: KERNEL_TOOL_NAMES.LS,
    description: LS_TOOL_DESCRIPTION,
    kind: "read",
    parameters: LS_TOOL_SCHEMA,
  },
  {
    name: KERNEL_TOOL_NAMES.FIND,
    description: FIND_TOOL_DESCRIPTION,
    kind: "search",
    parameters: FIND_TOOL_SCHEMA,
  },
  {
    name: KERNEL_TOOL_NAMES.GREP,
    description: GREP_TOOL_DESCRIPTION,
    kind: "search",
    parameters: GREP_TOOL_SCHEMA,
  },
  {
    name: KERNEL_TOOL_NAMES.EDIT,
    description: EDIT_TOOL_DESCRIPTION,
    kind: "edit",
    sequential: true,
    parameters: EDIT_TOOL_SCHEMA,
  },
  {
    name: KERNEL_TOOL_NAMES.WRITE,
    description: WRITE_TOOL_DESCRIPTION,
    kind: "edit",
    sequential: true,
    parameters: WRITE_TOOL_SCHEMA,
  },
  {
    name: KERNEL_TOOL_NAMES.BASH,
    description: BASH_TOOL_DESCRIPTION,
    kind: "execute",
    parameters: BASH_TOOL_SCHEMA,
  },
];

export class KernelToolRegistry implements KernelToolRegistryPort {
  constructor(private readonly executor: AiricToolExecutor) {}

  definitions(): KernelToolDefinition[] {
    return KERNEL_TOOL_DEFINITIONS;
  }

  handler(name: string): KernelToolHandler | undefined {
    if (!KERNEL_TOOL_DEFINITIONS.some((tool) => tool.name === name)) {
      return undefined;
    }

    return async (session, args, ctx) => {
      return this.executor.execute(session, name, args, ctx, {
        onProposeEdit: ctx.permissionGate
          ? async (edit, toolCallId) => ctx.permissionGate!(edit, toolCallId)
          : undefined,
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
      case KERNEL_TOOL_NAMES.READ:
        return {
          title: `Read ${path ?? "file"}`,
          kind: "read",
          rawInput: args,
          locations: path ? [{ path }] : undefined,
        };
      case KERNEL_TOOL_NAMES.LS:
        return {
          title: `List ${path ?? "."}`,
          kind: "read",
          rawInput: args,
          locations: path ? [{ path }] : undefined,
        };
      case KERNEL_TOOL_NAMES.FIND:
        return {
          title: `Find ${String(args.pattern ?? "")}`,
          kind: "search",
          rawInput: args,
          locations: path ? [{ path }] : undefined,
        };
      case KERNEL_TOOL_NAMES.GREP:
        return {
          title: `Grep /${String(args.pattern ?? "")}/`,
          kind: "search",
          rawInput: args,
          locations: path ? [{ path }] : undefined,
        };
      case KERNEL_TOOL_NAMES.EDIT:
        return {
          title: `Edit ${path ?? "file"}`,
          kind: "edit",
          rawInput: args,
          locations: path ? [{ path }] : undefined,
        };
      case KERNEL_TOOL_NAMES.WRITE:
        return {
          title: `Write ${path ?? "file"}`,
          kind: "edit",
          rawInput: args,
          locations: path ? [{ path }] : undefined,
        };
      case KERNEL_TOOL_NAMES.BASH:
        return {
          title: `$ ${String(args.command ?? "")}`,
          kind: "execute",
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
