# Document ID Schema

Airic uses a structured identifier (ID) system to reference documents across the workspace. Every ID maps mechanically to a file path and every file path maps back to an ID — no metadata lookup required.

## Motivation

Two problems drove the need for an explicit ID schema:

1. **Disjoint namespaces.** System documents live in `.airic/`, pack documents live in `.airic/packs/{pack}/`, user documents live in the workspace root. Without namespaces, IDs collide or require context to disambiguate.
2. **Non-invertible naming.** The old `core.tool.read` could mean "the tool document type definition" or "the read tool instance" depending on where you looked. The mapping from ID to file path was ambiguous.

The schema below fixes both.

## Namespace Tier

Every ID begins with a namespace segment that determines its base directory:

| Namespace | Base Directory | Purpose |
|---|---|---|
| `airic` | `.airic/` | Airic's own configuration and metadata |
| `{packname}` | `.airic/packs/{packname}/` | A named pack registered in `config.yml` under `packs` |
| `ws` | workspace root (`/`) | User documents anywhere in the project |

The pack namespace is **dynamic**. Any pack registered in `.airic/config.yml` becomes a valid namespace automatically:

```yaml
packs:
  core: .airic/packs/core
  community: .airic/packs/community
```

This registers `core` and `community` as namespaces.

## Path Resolution Rules

### Basic transformation

Replace `.` with `/` in the ID, then resolve relative to the namespace's base directory.

```
airic.base-instruction           → .airic/base-instruction.md
ws.docs.api.overview             → docs/api/overview.md
ws.README                        → README.md
```

### Extension handling

- If the final segment contains a `.`, it is treated as the filename (including extension), and `.md` is **not** appended.
- Otherwise, `.md` is appended automatically.

```
ws.docker-compose.yml            → docker-compose.yml       (literal filename)
ws.docs.api.spec.yaml            → docs/api/spec.yaml       (literal filename)
ws.docs.api.overview             → docs/api/overview.md     (.md appended)
ws.README                        → README.md                (.md appended)
```

### Pack paths

Pack subdirectory names match ID segments exactly (singular form). Resolution is the same mechanical dot-to-slash transform:

```
core.tool.read                   → .airic/packs/core/tool/read.md
core.document-type.tool          → .airic/packs/core/document-type/tool.md
core.mode.thinking-partner       → .airic/packs/core/mode/thinking-partner.md
core.process.precedent-extraction → .airic/packs/core/process/precedent-extraction.md
core.base-instruction            → .airic/packs/core/base-instruction.md
```

### Full resolution algorithm (pseudocode)

```
function resolve(id: string) -> path:
    segments = id.split(".")
    namespace = segments[0]
    remaining = segments[1:]

    if namespace == "airic":
        base = ".airic"
    elif namespace in registered_packs:
        base = registered_packs[namespace]
    elif namespace == "ws":
        base = ""
    else:
        error("unknown namespace: {namespace}")

    rel = "/".join(remaining)   # literal filename extensions handled separately

    if "." not in rel:
        rel = rel + ".md"

    return base + "/" + rel
```

## Reversibility (path → ID)

The mapping is invertible for any file that falls under a known namespace.

```
.airic/base-instruction.md              → airic.base-instruction
.airic/packs/core/tool/read.md         → core.tool.read
.airic/packs/core/document-type/tool.md → core.document-type.tool
docs/api/overview.md                    → ws.docs.api.overview
docker-compose.yml                      → ws.docker-compose.yml
```

To reverse: strip the base directory prefix, replace `/` with `.`, and strip `.md` if present.

## Usage in documents

Any document type (task, precedent, mode, etc.) can reference other documents by ID in its frontmatter or body:

```yaml
---
doc_type: task
references:
  - core.tool.edit
  - ws.docs.architecture.overview
depends_on:
  - core.process.task-decomposition
---
```

The resolver loads the referenced document by resolving the ID to a path and reading the file. No additional configuration or metadata is needed.

## Edge cases

| ID | Resolution | Notes |
|---|---|---|
| `core.base-instruction` | `.airic/packs/core/base-instruction.md` | Pack root file, no subdirectory segment |
| `core.base-instruction-v2` | `.airic/packs/core/base-instruction-v2.md` | Hyphen allowed in name segment |
| `ws.src.main.ts` | `src/main.ts` | Non-.md extension preserved |
| `airic.cache.some-key` | `.airic/cache/some-key.md` | Subdirectories follow ID segments directly |
| `airic.logs.2025-03` | `.airic/logs/2025-03.md` | Same |

## Design constraints

- **No metadata dependency.** The resolver should not need to consult `config.yml` for anything other than the pack base directory mapping.
- **No type context.** The same ID always resolves to the same path regardless of where it appears (frontmatter reference, conversation, etc.).
- **Mechanical mapping.** Dot-separated ID segments map directly to path segments under each namespace base — no pluralization or other exceptions.