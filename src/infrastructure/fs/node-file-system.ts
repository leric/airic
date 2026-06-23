import { access, copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { FileSystemPort } from "../../application/ports/file-system-port.js";

export class NodeFileSystem implements FileSystemPort {
  async exists(path: string): Promise<boolean> {
    try {
      await access(path);
      return true;
    } catch (error) {
      if (isEnoent(error)) {
        return false;
      }
      throw error;
    }
  }

  async readText(path: string): Promise<string> {
    return readFile(path, "utf8");
  }

  async writeText(path: string, content: string): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, "utf8");
  }

  async mkdir(path: string, recursive = true): Promise<void> {
    await mkdir(path, { recursive });
  }

  async copyFile(source: string, destination: string): Promise<void> {
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(source, destination);
  }

  async readDir(path: string): Promise<string[]> {
    const entries = await readdir(path, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => `${path}/${entry.name}`.replace(/\\/g, "/"));
  }
}

function isEnoent(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
