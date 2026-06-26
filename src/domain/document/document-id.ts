export type PackConfig = Record<string, string>;

function normalizeRelativePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\.\//, "");
}

function joinRelativePath(...segments: string[]): string {
  return segments
    .flatMap((segment) => segment.split("/"))
    .filter((segment) => segment.length > 0)
    .join("/");
}

const LITERAL_FILE_EXTENSIONS = new Set([
  "yml",
  "yaml",
  "ts",
  "tsx",
  "js",
  "jsx",
  "json",
  "toml",
  "txt",
  "csv",
]);

function buildRelativePathFromSegments(segments: string[]): string {
  if (
    segments.length >= 2 &&
    LITERAL_FILE_EXTENSIONS.has(segments[segments.length - 1])
  ) {
    const filename = `${segments[segments.length - 2]}.${segments[segments.length - 1]}`;
    const dirs = segments.slice(0, -2);
    return joinRelativePath(...dirs, filename);
  }

  return joinRelativePath(...segments);
}

function appendExtensionIfNeeded(rel: string): string {
  if (rel.includes(".")) {
    return rel;
  }
  return `${rel}.md`;
}

function stripMdExtension(filename: string): string {
  return filename.endsWith(".md") ? filename.slice(0, -".md".length) : filename;
}

export function resolveDocumentId(id: string, packs: PackConfig): string {
  const segments = id.split(".");
  const namespace = segments[0];
  const remaining = segments.slice(1);

  if (remaining.length === 0) {
    throw new Error(`Document id must have path segments after namespace: ${id}`);
  }

  let base: string;
  if (namespace === "airic") {
    base = ".airic";
  } else if (namespace === "ws") {
    base = "";
  } else if (namespace in packs) {
    base = packs[namespace];
  } else {
    throw new Error(`Unknown namespace: ${namespace}`);
  }

  const rel =
    remaining.length === 1
      ? remaining[0]
      : buildRelativePathFromSegments(remaining);

  return joinRelativePath(base, appendExtensionIfNeeded(rel));
}

export function pathToDocumentId(
  path: string,
  packs: PackConfig,
): string | undefined {
  const normalized = normalizeRelativePath(path);

  for (const [packName, packPath] of Object.entries(packs)) {
    const packPrefix = normalizeRelativePath(packPath);
    if (normalized === packPrefix || normalized.startsWith(`${packPrefix}/`)) {
      const afterPack =
        normalized === packPrefix
          ? ""
          : normalized.slice(packPrefix.length + 1);
      return buildPackDocumentId(packName, afterPack);
    }
  }

  if (normalized === ".airic" || normalized.startsWith(".airic/")) {
    const afterAiric =
      normalized === ".airic" ? "" : normalized.slice(".airic/".length);
    return buildAiricDocumentId(afterAiric);
  }

  return buildWsDocumentId(normalized);
}

function buildPackDocumentId(packName: string, relativePath: string): string | undefined {
  if (!relativePath) {
    return undefined;
  }

  const segments = relativePath.split("/");
  const filename = stripMdExtension(segments[segments.length - 1]);
  const dirSegments = segments.slice(0, -1);

  if (dirSegments.length === 0) {
    return `${packName}.${filename}`;
  }

  return `${packName}.${[...dirSegments, filename].join(".")}`;
}

function buildAiricDocumentId(relativePath: string): string | undefined {
  if (!relativePath) {
    return undefined;
  }

  const segments = relativePath.split("/");
  const filename = stripMdExtension(segments[segments.length - 1]);
  const dirSegments = segments.slice(0, -1);
  const idSegments = [...dirSegments, filename];
  return `airic.${idSegments.join(".")}`;
}

function buildWsDocumentId(relativePath: string): string | undefined {
  if (!relativePath) {
    return undefined;
  }

  const segments = relativePath.split("/");
  const filename = segments[segments.length - 1];
  const dirSegments = segments.slice(0, -1);

  if (dirSegments.length === 0) {
    const segment = filename.endsWith(".md")
      ? stripMdExtension(filename)
      : filename;
    return `ws.${segment}`;
  }

  const lastSegment = filename.endsWith(".md")
    ? stripMdExtension(filename)
    : filename;
  return `ws.${[...dirSegments, lastSegment].join(".")}`;
}

/** Maps a document's `doc_type` frontmatter value to its document-type spec id. */
export function documentTypeToSpecId(docType: string): string {
  if (docType === "core.document-type") {
    return "core.document-type.document-type";
  }

  if (docType.startsWith("core.")) {
    return `core.document-type.${docType.slice("core.".length)}`;
  }

  return `core.document-type.${docType}`;
}

export const DOCUMENT_TYPE_META_IDS = {
  mode: "core.document-type.mode",
  process: "core.document-type.process",
  tool: "core.document-type.tool",
  documentType: "core.document-type.document-type",
  task: "core.document-type.task",
  precedent: "core.document-type.precedent",
} as const;

export function packSpecDirectory(
  packPath: string,
  subdirectorySegment: string,
): string {
  return joinRelativePath(packPath, subdirectorySegment);
}
