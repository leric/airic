import {
  resolveWithinWorkspace,
  toRelativePath,
} from "../../domain/path/workspace-path.js";

export class PathResolver {
  constructor(private readonly workspaceRoot: string) {}

  resolve(inputPath: string): string {
    return resolveWithinWorkspace(inputPath, this.workspaceRoot);
  }

  toRelative(absolutePath: string): string {
    return toRelativePath(this.workspaceRoot, absolutePath);
  }
}

export function fileUriToPath(uri: string): string {
  if (uri.startsWith("file://")) {
    const url = new URL(uri);
    return decodeURIComponent(url.pathname).replace(/\\/g, "/");
  }
  return uri.replace(/\\/g, "/");
}

// Re-export for callers that need relative paths without constructing PathResolver.
export { toRelativePath as relativeToWorkspace } from "../../domain/path/workspace-path.js";
