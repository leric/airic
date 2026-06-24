export const KERNEL_TOOL_NAMES = {
  READ: "read",
  LS: "ls",
  FIND: "find",
  GREP: "grep",
  EDIT: "edit",
  WRITE: "write",
  BASH: "bash",
} as const;

export type KernelToolName =
  (typeof KERNEL_TOOL_NAMES)[keyof typeof KERNEL_TOOL_NAMES];

export const ALL_KERNEL_TOOL_NAMES = Object.values(KERNEL_TOOL_NAMES);
