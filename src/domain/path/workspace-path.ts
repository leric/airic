import { isAbsolute, join, normalize, relative } from "node:path";

/**
 * Canonical workspace-relative path resolution.
 * Used by application PathResolver and infrastructure tools (via re-export).
 */
export function expandPath(filePath: string): string {
  const trimmed = filePath.trim().replace(/^@+/, "");
  if (trimmed.startsWith("~/")) {
    const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
    return normalize(join(home, trimmed.slice(2))).replace(/\\/g, "/");
  }
  return normalize(trimmed).replace(/\\/g, "/");
}

export function resolveToCwd(filePath: string, cwd: string): string {
  const expanded = expandPath(filePath);
  if (isAbsolute(expanded)) {
    return expanded.replace(/\\/g, "/");
  }
  return normalize(join(cwd, expanded)).replace(/\\/g, "/");
}

export function resolveWithinWorkspace(
  filePath: string,
  workspaceRoot: string,
): string {
  const trimmed = filePath.trim();
  if (!trimmed && filePath !== ".") {
    throw new Error("Path must not be empty");
  }

  const absolute = resolveToCwd(trimmed || ".", workspaceRoot);
  const rel = relative(workspaceRoot, absolute);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error(`Path escapes workspace: ${filePath}`);
  }
  return absolute.replace(/\\/g, "/");
}

export function toRelativePath(basePath: string, absolutePath: string): string {
  return relative(basePath, absolutePath).replace(/\\/g, "/");
}
