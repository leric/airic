import {
  access,
  appendFile,
  copyFile,
  mkdir,
  readdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { dirname } from "node:path";
import type {
  FileEntry,
  FileSystemPort,
  TextSearchMatch,
} from "../../application/ports/file-system-port.js";

const MAX_SEARCH_FILES = 200;
const MAX_SEARCH_MATCHES = 50;

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

  async appendText(path: string, content: string): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    await appendFile(path, content, "utf8");
  }

  async mkdir(path: string, recursive = true): Promise<void> {
    await mkdir(path, { recursive });
  }

  async copyFile(source: string, destination: string): Promise<void> {
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(source, destination);
  }

  async readDir(path: string): Promise<string[]> {
    const entries = await this.listEntries(path);
    return entries
      .filter((entry) => entry.type === "file")
      .map((entry) => entry.path);
  }

  async listEntries(path: string): Promise<FileEntry[]> {
    const entries = await readdir(path, { withFileTypes: true });
    return entries.map((entry) => ({
      name: entry.name,
      path: `${path}/${entry.name}`.replace(/\\/g, "/"),
      type: entry.isDirectory() ? "directory" : "file",
    }));
  }

  async searchText(rootPath: string, query: string): Promise<TextSearchMatch[]> {
    const matches: TextSearchMatch[] = [];
    let scannedFiles = 0;

    const walk = async (dirPath: string): Promise<void> => {
      if (matches.length >= MAX_SEARCH_MATCHES || scannedFiles >= MAX_SEARCH_FILES) {
        return;
      }

      const exists = await this.exists(dirPath);
      if (!exists) {
        return;
      }

      const entries = await this.listEntries(dirPath);
      for (const entry of entries) {
        if (matches.length >= MAX_SEARCH_MATCHES || scannedFiles >= MAX_SEARCH_FILES) {
          return;
        }

        if (entry.name.startsWith(".airic")) {
          continue;
        }

        if (entry.type === "directory") {
          await walk(entry.path);
          continue;
        }

        if (!isTextFile(entry.name)) {
          continue;
        }

        scannedFiles += 1;
        const content = await this.readText(entry.path);
        const lines = content.split("\n");
        for (let index = 0; index < lines.length; index += 1) {
          const line = lines[index]!;
          if (line.includes(query)) {
            matches.push({
              path: entry.path,
              line: index + 1,
              text: line.trim(),
            });
            if (matches.length >= MAX_SEARCH_MATCHES) {
              return;
            }
          }
        }
      }
    };

    await walk(rootPath);
    return matches;
  }
}

function isTextFile(name: string): boolean {
  return /\.(md|txt|json|ya?ml|ts|tsx|js|jsx|css|html|toml|rs|py|go|sh)$/i.test(
    name,
  );
}

function isEnoent(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
