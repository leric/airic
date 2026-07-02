import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { FileSystemPort } from "../ports/file-system-port.js";

/** Bundled `.airic/` directory shipped with the Airic package (repo root or npm install root). */
export function resolveBundledAiricRoot(): string {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  return join(moduleDir, "..", "..", "..", ".airic");
}

export type BootstrapResult = {
  workspaceRoot: string;
  airicRoot: string;
  createdPaths: string[];
};

export async function bootstrapWorkspace(
  fs: FileSystemPort,
  workspaceRoot: string,
): Promise<BootstrapResult> {
  const bundledAiricRoot = resolveBundledAiricRoot();
  const airicRoot = join(workspaceRoot, ".airic");
  const createdPaths: string[] = [];

  await ensureDir(fs, airicRoot, createdPaths);
  await ensureDir(fs, join(airicRoot, "packs", "core"), createdPaths);
  await ensureDir(fs, join(airicRoot, "sessions"), createdPaths);
  await ensureDir(fs, join(airicRoot, "logs"), createdPaths);
  await ensureDir(fs, join(airicRoot, "cache"), createdPaths);

  await seedFileIfMissing(
    fs,
    join(bundledAiricRoot, "config.default.yml"),
    join(airicRoot, "config.yml"),
    createdPaths,
  );

  await seedDirectoryIfMissing(
    fs,
    join(bundledAiricRoot, "packs", "core"),
    join(airicRoot, "packs", "core"),
    createdPaths,
  );

  await seedDirectoryIfMissing(
    fs,
    join(bundledAiricRoot, "packs", "packman"),
    join(airicRoot, "packs", "packman"),
    createdPaths,
  );

  return { workspaceRoot, airicRoot, createdPaths };
}

async function ensureDir(
  fs: FileSystemPort,
  path: string,
  createdPaths: string[],
): Promise<void> {
  const exists = await fs.exists(path);
  if (!exists) {
    await fs.mkdir(path, true);
    createdPaths.push(path);
  }
}

async function seedFileIfMissing(
  fs: FileSystemPort,
  sourcePath: string,
  destinationPath: string,
  createdPaths: string[],
): Promise<void> {
  const destinationExists = await fs.exists(destinationPath);
  if (destinationExists) {
    return;
  }

  const sourceExists = await fs.exists(sourcePath);
  if (!sourceExists) {
    throw new Error(`Bundled Airic file not found: ${sourcePath}`);
  }

  await fs.mkdir(dirname(destinationPath), true);
  await fs.copyFile(sourcePath, destinationPath);
  createdPaths.push(destinationPath);
}

async function seedDirectoryIfMissing(
  fs: FileSystemPort,
  sourceRoot: string,
  destinationRoot: string,
  createdPaths: string[],
): Promise<void> {
  const sourceExists = await fs.exists(sourceRoot);
  if (!sourceExists) {
    throw new Error(`Bundled Airic directory not found: ${sourceRoot}`);
  }

  await fs.mkdir(destinationRoot, true);

  const entries = await fs.listEntries(sourceRoot);
  for (const entry of entries) {
    const destinationPath = join(destinationRoot, entry.name);
    if (entry.type === "directory") {
      await seedDirectoryIfMissing(
        fs,
        entry.path,
        destinationPath,
        createdPaths,
      );
      continue;
    }

    const destinationExists = await fs.exists(destinationPath);
    if (destinationExists) {
      continue;
    }

    await fs.copyFile(entry.path, destinationPath);
    createdPaths.push(destinationPath);
  }
}
