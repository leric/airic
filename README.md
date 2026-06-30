# Airic

**Markdown-configured agent kernel for your workspace, exposed through [ACP](https://agentclientprotocol.com/) (Agent Client Protocol).**

Airic sits on top of an existing project folder. Your files stay yours — Airic only owns `.airic/` (config, behavior specs, sessions, and logs). Agent behavior, modes, processes, and tool guidance live in markdown under that directory, so you can read and edit them like any other project file.

Connect from [Zed](https://zed.dev/) or any ACP-compatible client to chat, explore the workspace, propose edits with user confirmation, and run markdown-defined workflows.

## Features

- **ACP-native** — stdio JSON-RPC server via `@agentclientprotocol/sdk`; works as a Zed agent server out of the box.
- **Markdown-driven behavior** — modes, document types, processes, and per-tool usage docs ship as a core pack under `.airic/packs/core/`.
- **Workspace tools** — read, search, list, edit, write, shell, and process lifecycle tools with path sandboxing and optional user confirmation before mutations.
- **Document-type awareness** — when the focused file declares `doc_type` in frontmatter, the matching spec is loaded into runtime context.
- **Process workflows** — start, track, complete, or cancel markdown-defined processes via slash commands or agent tools.
- **Session turn tree** — conversation history is a branching tree; model context follows the active cursor path, not the full graph.
- **Multi-provider LLM** — OpenAI, Anthropic, OpenRouter, or any OpenAI-compatible endpoint (Ollama, vLLM, custom gateways).

## Quick start

**Prerequisites:** Node.js 20+

### Install

**One-line install** (macOS / Linux):

```bash
curl -fsSL https://raw.githubusercontent.com/leric/airic/main/scripts/install.sh | bash
```

**Global install** (recommended for daily use with Zed):

```bash
npm install -g airic
airic --version
```

**Zero-install** (always runs the latest published version):

```bash
npx -y airic
```

Pin a version when installing globally: `AIRIC_VERSION=0.1.0 curl ... | bash` or `npm install -g airic@0.1.0`.

Open a workspace that should use Airic. On first connection, Airic bootstraps `.airic/` from the bundled core pack (config, directories, and default specs).

Set an API key for your chosen provider (see [Configuration](#configuration)), then connect from your ACP client (see [Connect from Zed](#connect-from-zed)).

### Develop from source

```bash
git clone https://github.com/leric/airic.git
cd airic
npm install
npm run dev    # runs src/main.ts via tsx
```

```bash
npm test
npm run build
```

## Connect from Zed

Add an agent server entry in Zed settings (`~/.config/zed/settings.json`):

```json
{
  "agent_servers": {
    "Airic": {
      "command": "airic",
      "env": {
        "OPENAI_API_KEY": "your-key"
      }
    }
  }
}
```

If you prefer not to install globally, use `npx`:

```json
{
  "agent_servers": {
    "Airic": {
      "command": "npx",
      "args": ["-y", "airic"],
      "env": {
        "OPENAI_API_KEY": "your-key"
      }
    }
  }
}
```

When developing from a clone, you can point at the compiled entry:

```json
"command": "node",
"args": ["/absolute/path/to/airic/dist/main.js"]
```

Open the Agent panel, start a new thread in your workspace, and pick the **Airic** server.

## Configuration

Workspace config lives at `.airic/config.yml`. A default is seeded on bootstrap; edit it to change model, mode, or editing policy.

**OpenAI (default):**

```yaml
default_mode: core.thinking-partner

llm:
  provider: openai
  model: gpt-4o

packs:
  core: .airic/packs/core

editing:
  require_confirmation: true

cache:
  enabled: true
```

**Anthropic or OpenRouter** — set `provider` to `anthropic` or `openrouter` and export `ANTHROPIC_API_KEY` or `OPENROUTER_API_KEY`.

**OpenAI-compatible endpoint** (Ollama, vLLM, custom API):

```yaml
llm:
  provider: openai-compatible
  model: your-model-id
  base_url: http://localhost:11434/v1
```

Optional LLM fields: `api_key`, `temperature`, `max_tokens`, `thinking_level` (`off` | `minimal` | `low` | `medium` | `high` | `xhigh`).

API keys can come from the environment (`OPENAI_API_KEY`, etc.) or from `llm.api_key` in config. A `.env` file in the project root is loaded at startup.

## Customize behavior

The bundled **core pack** defines how Airic thinks and acts:

```text
.airic/packs/core/
  base-instruction.md      # kernel-wide principles
  mode/                    # thinking modes (default: thinking-partner)
  document-type/           # meta + concrete doc types (task, precedent, …)
  process/                 # runnable workflows (task-decomposition, …)
  tool/                    # one usage doc per kernel tool
```

- **Default mode:** `core.thinking-partner` — a thinking-first posture; switch modes via ACP `session/set_mode`.
- **Add or edit specs** in your workspace copy under `.airic/packs/core/` (bootstrap only seeds missing files; your edits are preserved).
- **Processes** are discovered from `process/*.md` and driven with `/process` or agent tools.

See [docs/kernel-tdd.md](docs/kernel-tdd.md) for the full kernel design and [architecture-map.md](architecture-map.md) for layer boundaries and extension points.

## Workspace layout

```text
your-project/
  src/                     # your code — Airic does not own this
  docs/
  ...

  .airic/                  # Airic-owned
    config.yml
    packs/core/            # behavior specs
    sessions/              # persisted session state
    logs/                  # e.g. accepted edits log
    cache/
```

## Agent tools

| Tool | Purpose |
| --- | --- |
| `read` | Read file contents (optional offset/limit) |
| `ls` | List directory entries |
| `find` | Find files by glob pattern |
| `grep` | Search file contents |
| `edit` | Exact oldText → newText replacements (user confirms before write) |
| `write` | Create or overwrite files (user confirms before write) |
| `bash` | Run a shell command in the workspace |
| `process.start` / `process.complete` / `process.cancel` | Process workflow lifecycle |

When `editing.require_confirmation` is true, `edit` and `write` produce reviewable diffs in the client; accepted changes are logged to `.airic/logs/edits.log`.

## Slash commands

| Command | Description |
| --- | --- |
| `/tree` | Show the current session turn tree |
| `/process list` | List available processes |
| `/process start <id>` | Start a process |
| `/process status` | Status of active processes |
| `/process complete` | Complete the active process |
| `/process cancel [reason]` | Cancel the active process |

## Architecture

Clean Architecture monolith — domain at the center, ACP as a delivery adapter:

```text
src/domain/           Pure models (session, tools, paths)
src/application/    Use cases, ports, runtime context
src/infrastructure/ LLM (Pi), filesystem, config, tools, store
src/interfaces/acp/ ACP adapter (not part of the kernel)
```

**Stack:** TypeScript (ESM), Node 20+, Pi agent core for the LLM loop, Vitest for tests. Published on npm as [`airic`](https://www.npmjs.com/package/airic).

## License

[MIT](LICENSE)
