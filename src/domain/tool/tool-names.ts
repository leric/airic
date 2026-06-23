export const KERNEL_TOOL_NAMES = {
  LIST_FILES: "list_files",
  READ_FILE: "read_file",
  CREATE_FILE: "create_file",
  PROPOSE_EDIT: "propose_edit",
  SEARCH_TEXT: "search_text",
} as const;

export type KernelToolName =
  (typeof KERNEL_TOOL_NAMES)[keyof typeof KERNEL_TOOL_NAMES];
