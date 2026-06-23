import { isAbsolute, join, normalize, relative } from "node:path";

export class PathResolver {
  constructor(private readonly workspaceRoot: string) {}

  resolve(inputPath: string): string {
    const trimmed = inputPath.trim();
    if (!trimmed) {
      throw new Error("Path must not be empty");
    }

    const absolute = isAbsolute(trimmed)
      ? normalize(trimmed)
      : normalize(join(this.workspaceRoot, trimmed));

    const rel = relative(this.workspaceRoot, absolute);
    if (rel.startsWith("..") || isAbsolute(rel)) {
      throw new Error(`Path escapes workspace: ${inputPath}`);
    }

    return absolute.replace(/\\/g, "/");
  }

  toRelative(absolutePath: string): string {
    return relative(this.workspaceRoot, absolutePath).replace(/\\/g, "/");
  }
}

export function fileUriToPath(uri: string): string {
  if (uri.startsWith("file://")) {
    const url = new URL(uri);
    return decodeURIComponent(url.pathname).replace(/\\/g, "/");
  }
  return uri.replace(/\\/g, "/");
}
