# Airic

Markdown-configured agent kernel with an ACP (Agent Client Protocol) interface.

## Step 2: File Tools + doc_type-aware Editing

Airic can read workspace files, create files, propose reviewable edits, and load document-type specs when the current document declares `doc_type`.

### Tools available to the agent

- `list_files(path)`
- `read_file(path)`
- `create_file(path, content)`
- `propose_edit(path, content)` — user must accept before write
- `search_text(query, path?)`

Edits are logged to `.airic/logs/edits.log` after acceptance.

### Current document

When a file is opened or focused in the ACP client, Airic sets `session.currentDocument` and includes the file in runtime context. If the file declares `doc_type` in frontmatter, the matching spec from `.airic/specs/document-types/` is loaded.

## Step 1: ACP Chat Agent

Airic loads agent behavior from markdown specs under `.airic/` and exposes a chat interface via ACP.

### Prerequisites

- Node.js 20+
- `OPENAI_API_KEY` environment variable

### Run locally

```bash
npm install
npm run build
OPENAI_API_KEY=sk-... npm run dev
```

### Connect from Zed

Add to your Zed settings:

```json
{
  "agent_servers": {
    "Airic": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/airic/src/main.ts"],
      "env": {
        "OPENAI_API_KEY": "your-key"
      }
    }
  }
}
```

Open the Agent panel and start a new Airic thread in your workspace.

### Behavior configuration

Active role specs live in `.airic/specs/roles/`. The default role is `core.thinking-partner` (see `.airic/config.yml`).

Edit `.airic/specs/roles/thinking-partner.md` and start a new session to change agent behavior.

Base kernel instructions come from `.airic/packs/core/base-instruction.md`.

Core pack layout:

```text
.airic/packs/core/
  base-instruction.md
  roles/              # concrete role instances (e.g. thinking-partner)
  document-types/     # meta definitions: role, document-type, process spec kinds
  processes/          # concrete process instances

.airic/specs/
  roles/              # active role specs (synced from pack)
  document-types/     # concrete document-type specs (e.g. decision, note, task)
  processes/          # active process specs (synced from pack)
```

## Architecture

Clean Architecture monolith:

```text
src/domain/          Pure models
src/application/     Use cases and ports
src/infrastructure/  LLM, filesystem, config, session store
src/interfaces/acp/  ACP adapter (not part of kernel)
```

## Development

```bash
npm test
npm run build
```
