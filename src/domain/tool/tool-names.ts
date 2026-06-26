export const KERNEL_TOOL_NAMES = {
  READ: "read",
  LS: "ls",
  FIND: "find",
  GREP: "grep",
  EDIT: "edit",
  WRITE: "write",
  BASH: "bash",
  PROCESS_START: "process.start",
  PROCESS_COMPLETE: "process.complete",
  PROCESS_CANCEL: "process.cancel",
  PROCESS_STATUS: "process.status",
  PROCESS_LIST: "process.list",
} as const;

export type KernelToolName =
  (typeof KERNEL_TOOL_NAMES)[keyof typeof KERNEL_TOOL_NAMES];

/** Every name here requires a matching `core.tool` doc (`tool:` frontmatter).
 *  Sync guard: `tests/tool-usage-catalog.test.ts`. Closure: `architecture-map.md`. */
export const ALL_KERNEL_TOOL_NAMES = Object.values(KERNEL_TOOL_NAMES);
