# Airic Kernel Technical Design v0.2

> Status: reflects the current implementation, not a forward-looking plan. Where this
> document and the code disagree, the code (`src/`) is authoritative.

## 1. Purpose

Airic Kernel is a markdown-configured agent runtime over a user-owned workspace, exposed
to editors through ACP (Agent Client Protocol).

The shipped kernel can:

- Chat with the user through an ACP client (e.g. Zed).
- Read, search, create, and edit workspace files via reviewable, audited tools.
- Run a shell command tool.
- Load agent behavior from markdown specs under `.airic/` (modes, document-types, processes).
- Load core runtime instructions from a core pack.
- Enter document-type-aware editing when the focused markdown file declares `doc_type` in
  frontmatter.
- Store session history as a turn tree and expose stack-style `/digin` and `/sumup`
  navigation to keep digressions out of the main reasoning context.
- Discover and run markdown-defined processes with a full lifecycle (start / complete /
  cancel), driven by either user commands or agent tool calls.
- Talk to multiple LLM providers (OpenAI, Anthropic, OpenRouter, or any OpenAI-compatible
  endpoint).

Airic is not a document management system. It does not own the user's project documents.
It only provides an agent layer over an existing workspace and owns `.airic/`.

---

## 2. Core Principle

The user workspace is owned by the user. Airic only owns `.airic/`.

```text
user-workspace/
  README.md
  docs/
  src/
  ...

  .airic/
    config.yml
    specs/
    packs/
    sessions/
    logs/
    cache/
```

Project files remain ordinary user files. Airic reads and edits them when requested, but
imposes no hidden directory structure, resource IDs, overlay graphs, or persistent semantic
bindings on them.

---

## 3. Technology Stack

| Concern | Choice |
| --- | --- |
| Language / runtime | TypeScript (ESM), Node.js 20+ |
| Architecture | Clean Architecture monolith |
| Client protocol | ACP via `@agentclientprotocol/sdk` over stdio |
| Agent loop | `@earendil-works/pi-agent-core` (`Agent`) |
| LLM access | `@earendil-works/pi-ai` (multi-provider) |
| Markdown frontmatter | `gray-matter` |
| Config | `js-yaml` |
| Diffs | `diff` |
| Tests | `vitest` |

Entry point: `src/main.ts` loads environment variables (`.env`) then starts the ACP server,
which speaks newline-delimited JSON over `stdin`/`stdout`.

```typescript
loadEnvFile();
startAcpServer();
```

---

## 4. Architecture Layers

The repository is a single deployable organized by Clean Architecture. Dependencies point
inward; outer layers depend on inner layers through ports (interfaces).

```text
src/
  domain/          Pure models and tree/spec/tool logic (no I/O)
  application/     Use cases, ports, and orchestration services
  infrastructure/  Adapters: pi-agent runtime, LLM provider, fs, store, markdown, tools
  interfaces/      ACP adapter (delivery mechanism; not part of the kernel)
```

### 4.1 Domain (`src/domain/`)

- `session/` — `Session`, `TurnNode`, `DigFrame`, turn-tree operations (`appendTurn`,
  `beginDig`, `popDigFrame`, `cursorPath`, `projectCursorPath`, `projectDigressionPath`,
  `createReturnSummaryTurn`, `renderTree`), `parseSessionCommand`, `ensureSessionTree`.
- `spec/` — `SpecDocument`, spec id / doc_type parsing (`core.mode`, `core.document-type`,
  `core.process`).
- `tool/` — `AiricToolDefinition`, tool kinds, policy/confirmation predicates,
  `AiricToolResult`, `PendingEdit`, `ToolCallPresentation`, kernel tool name constants.
- `document/`, `path/`, `agent/` — markdown document shape, workspace path resolution,
  `TranscriptMessage`.

The domain layer performs no I/O and no LLM calls. It is the home of the turn-tree
anti-pollution logic and spec/tool typing.

### 4.2 Application (`src/application/`)

**Ports** (`ports/`) define the boundaries the kernel depends on:

- `FileSystemPort`, `SessionStorePort`, `ConfigLoaderPort`
- `AgentRuntimePort` (`runTurn`, `complete`, `abort`)
- `ToolRegistryPort`, `ToolExecutorPort`, `ToolPolicyPort`

**Use cases** (`use-cases/`):

- `SendMessageUseCase` — the runtime loop (see §10).
- `bootstrapWorkspace` / `syncCorePackToSpecs` — create and sync `.airic/`.
- `SelectModeUseCase` — switch the active mode.
- `OpenDocumentUseCase`, `ProposeFileEditUseCase`, `ApplyFileEditUseCase` — current-document
  tracking and the reviewable edit pipeline.

**Services** (`services/`):

- `WorkspaceRuntimeLoader` → builds a `WorkspaceRuntime` (config, base instruction, kernel
  prompt templates from `packs/core/prompts/`, `SpecRegistry`).
- `session-sumup-builder` → renders the `/sumup` system + user prompts from the core-pack
  templates, substituting `{{resumePoint}}`, `{{topic}}`, and `{{baseContext}}`.
- `RuntimeContextBuilder` → assembles the system prompt (mode, process index/spec, current
  document + doc_type spec) with a refresh hook so the document context stays current across
  tool rounds.
- `SpecRegistry` → in-memory map of specs by id, with `listByDocType`.
- `process-catalog` + `process-lifecycle` → process index text and start/complete/cancel/
  status state transitions.
- `tool-usage-catalog` → builds always-resident `## Tool Usage` text from `core.tool` specs.
- `KernelToolRegistry` → adapts Airic tool definitions for the agent runtime; `ToolExecutor`
  → policy checks, execution, and diff-confirmation routing; `MutationCoordinator` → the
  propose → confirm → apply → log flow.
- Support services: `current-document-context`, `document-type-resolver`, `mode-catalog`,
  `command-catalog`, `edit-store`, `edit-log`, `path-resolver`, `session-sumup-builder`.

### 4.3 Infrastructure (`src/infrastructure/`)

- `agent/` — `PiAgentRuntime` (wraps `@earendil-works/pi-agent-core` `Agent`),
  `PiModelResolver` (provider/model resolution incl. OpenAI-compatible), `pi-transcript-mapper`
  (Airic ↔ Pi message conversion).
- `config/` — `YamlConfigLoader`, `load-env`.
- `fs/` — `NodeFileSystem`.
- `store/` — `JsonSessionStore` (one JSON file per session under `.airic/sessions/`).
- `markdown/` — `frontmatter-parser` (gray-matter), `DocumentLoader`.
- `diff/` — `DiffService`.
- `tools/` — concrete tool implementations: `file/` (read, ls, find, grep, edit, write),
  `shell/` (bash), `process/` (start, complete, cancel, status, list), plus `common/`
  helpers (edit-diff, mutation queue, path utils, truncation, result formatting) and the
  factories `create-tool-registry` / `create-tool-runtime`.

### 4.4 Interfaces (`src/interfaces/acp/`)

The ACP adapter is a delivery mechanism, deliberately kept outside the kernel:

- `acp-server` — wires stdio streams to the ACP agent app.
- `acp-adapter` — implements ACP requests/notifications and constructs per-prompt use cases.
- `acp-message-mapper`, `acp-event-mapper`, `acp-tool-event-mapper`, `acp-command-catalog` —
  translate between ACP wire types and kernel events.

---

## 5. `.airic` Directory Layout

```text
.airic/
  config.yml

  packs/
    core/
      base-instruction.md
      modes/                # concrete mode instances (thinking-partner)
      document-types/       # spec-kind definitions (mode, document-type, process, tool) + precedent
      processes/            # concrete processes (precedent-extraction, task-decomposition,
                            #   session-reflection)
      prompts/              # kernel prompt templates (sumup-system, sumup-user)
      tools/                # core.tool usage docs (one per system tool, always resident)

  specs/
    modes/                  # active mode specs (synced from pack)
    document-types/         # concrete doc-types (decision, task, note)
    processes/              # active process specs (synced from pack)

  sessions/
    <session-id>.json       # full session state incl. turn tree + process instances

  logs/
    edits.log               # append-only JSON-lines audit of applied edits

  cache/
```

### Bootstrapping and sync

On `session/new`, `bootstrapWorkspace` copies bundled content from the Airic package's
`.airic/` directory (shipped with the repo or npm install) into the user workspace: `config.default.yml`
→ `config.yml`, the full `packs/core/` tree, and default specs (`decision`, `task`, `note`).
Existing files are never overwritten. Pack prose is edited only under `.airic/packs/core/` in
the Airic repository — not duplicated in TypeScript.
`syncCorePackToSpecs` then copies pack `modes/` and `processes/` into `specs/` (copy only when
the destination does not already exist, so user edits are preserved). The base instruction,
prompt templates, and tool usage docs are loaded directly from the pack; they are not copied
into `specs/`.

---

## 6. Markdown Specs

All specs are ordinary markdown with minimal frontmatter; their body is prose for the agent
to read and follow. There are four spec doc types:

```text
core.mode             thinking style / session posture
core.document-type    quality bar for a kind of user document
core.process          repeatable, skill-like workflow with a lifecycle
core.tool             usage methodology for one system tool (one-to-one with tool name)
```

The `SpecRegistry` indexes specs by `id`. A document-type spec is resolved simply by looking
up the `doc_type` value as a spec id (e.g. `doc_type: core.decision` → spec `core.decision`).

Each spec doc type has a kind-definition document under `packs/core/document-types/`
(for example `tool.md` describes what a `core.tool` instance document is).

### Tool ownership

- **Capability / contract** (tool name, input schema, one-line description, hard constraints) =
  code in `src/infrastructure/tools/`.
- **Usage methodology** (when/why/how to combine tools) = `core.tool` documents in
  `packs/core/tools/`, bound one-to-one via frontmatter `tool:` (no override mechanism; edit
  in place).
- **Cross-tool creative usage** = ordinary `core.mode` / `core.process` prose layered on top.
- **Judgment** = agent.

All `core.tool` docs are always injected into the system prompt as `## Tool Usage`.

### Tool frontmatter

```yaml
id: core.tool.grep
doc_type: core.tool
tool: grep
title: grep Usage
```

The `tool` field must match a registered kernel tool name (`ALL_KERNEL_TOOL_NAMES`).

### Process frontmatter

Process specs carry machine-readable metadata used for the process index and activation
policy:

```yaml
id: core.task-decomposition
doc_type: core.process
title: Task Decomposition
summary: Turn clarified intent into executable task documents.
triggers:
  - user wants to turn discussion into executable tasks
outputs:
  - core.task
activation: suggested      # manual | suggested
```

`activation: manual` processes can only be started by the user; `suggested` processes may be
started by the agent, but activation always remains visible.

---

## 7. User Documents and `doc_type`

A user markdown file participates in document-type-aware editing only when it explicitly
declares `doc_type` in frontmatter. The kernel never infers persistent document semantics for
user files. When the ACP client opens or focuses such a file, the kernel:

1. Sets `session.currentDocument`.
2. Reads the file and parses frontmatter.
3. If `doc_type` resolves to a registered spec, loads that document-type spec into context.

---

## 8. Session Model

Session state is persisted as JSON per session (`JsonSessionStore`). It combines the
turn-tree history model with process lifecycle state.

```typescript
type Session = {
  id: string;
  workspaceRoot: string;
  modeId?: string;
  currentDocument?: string;

  activeProcessInstanceId?: string;
  processInstances: Record<string, ProcessInstance>;

  rootTurnId?: string;
  currentTurnId?: string;
  turns: Record<string, TurnNode>;
  digStack: DigFrame[];

  createdAt: string;
  updatedAt: string;
};
```

### 8.1 Turn tree

Each `TurnNode` is one user message + one assistant response, with a stable `id`, a
`parentId`, an auto-generated `title`, a `kind` (`normal` | `returnSummary`), and an optional
`toolTrace` (the full message slice incl. tool calls/results, kept for replay/export but
excluded from default model context).

`projectCursorPath(session)` walks `root → … → currentTurnId` and emits only user/assistant
text pairs. This is the core anti-pollution mechanism: sibling branches, post-`/sumup`
digression turns, and per-turn tool traces are not fed back into the model.

### 8.2 Process instances

```typescript
type ProcessInstance = {
  id: string;
  processId: string;
  status: "active" | "completed" | "cancelled";
  startedBy: "user" | "agent";
  startedAt: string;
  completedAt?: string;
  cancelledAt?: string;
  reason?: string;
  inputSummary?: string;
  outputSummary?: string;
  state?: Record<string, unknown>;
};
```

At most one process is active at a time (`activeProcessInstanceId`).

---

## 9. Context Assembly

`RuntimeContextBuilder.buildSystemPrompt` composes the system prompt from:

```text
base instruction (from core pack)
+ active mode spec body
+ EITHER the full active process spec (if a process is active)
  OR a compact process index (otherwise)
+ Tool Usage (all core.tool docs, always resident)
+ current document (path, doc_type, fenced content) and its document-type spec, if any
```

Conversation history is supplied separately as `projectCursorPath(session)` (the active
cursor path), not as flat chronological history.

Because tool rounds can change the current document on disk, `buildAgentContext` also returns
a `refreshSystemPrompt()` hook. The agent runtime calls it before each LLM context build so
the current-document section reflects the latest file content.

The process index keeps normal chat cheap: only `id`, `summary`, `triggers`, and `activation`
are injected. Full process bodies are loaded only while a process is active.

---

## 10. Runtime Loop (`SendMessageUseCase`)

For each prompt:

1. Load session; ensure the turn-tree fields exist.
2. Parse the message for a slash command (`/digin`, `/sumup`, `/tree`, `/process …`).
3. Command messages are handled directly (see §11 / §12) and stream a direct response.
4. Otherwise (`handleMessage`):
   - Resolve the active mode spec.
   - Build process context (active spec or process index).
   - Build tool usage text from `core.tool` specs.
   - Load current-document context (with a refresh closure).
   - Build the system context.
   - Project the cursor path as prior messages.
   - Call `agentRuntime.runTurn(...)`.
   - Re-load the session and merge process state (the `process.*` tools persist via the
     session store mid-turn).
   - `appendTurn` with the user message, assistant text, and tool trace; save the session.

### Agent runtime (`PiAgentRuntime`)

`runTurn` resolves the model, builds Pi tools from the kernel tool definitions, converts
prior messages to Pi format, and drives an `@earendil-works/pi-agent-core` `Agent`:

- Tools execute in parallel; mutating tools are marked `sequential` so edits serialize.
- A `transformContext` hook refreshes the system prompt each round.
- `afterToolCall` terminates the turn after `MAX_TOOL_ROUNDS` (8) to bound runaway loops.
- Agent events are mapped to kernel `AgentRuntimeEvent`s: `text_delta`, `tool_call_start`,
  `tool_call_end`, `run_end`.
- `abort()` cancels the active agent for a session.

`complete` is a lightweight, tool-free completion used by `/sumup` to generate the return
summary.

---

## 11. Session-Tree Navigation (`/digin`, `/sumup`, `/tree`)

The ACP surface exposes a simple stack-style workflow while the kernel keeps a full tree
internally.

- `/digin [topic]` — records the current cursor as a dig base and pushes a `DigFrame`. The
  next normal turns attach as a digression branch under that base.
- `/sumup` — projects the digression path, asks the LLM (`complete`) for a structured return
  summary, creates a `returnSummary` turn under the dig base, sets the cursor to it, and pops
  the frame. After `/sumup`, future context follows `root → … → baseTurn → returnSummary`,
  excluding the raw digression turns.
- `/tree` — debug rendering of the internal turn tree with the current cursor marked.

The return-summary prompt enforces a fixed structure (Returned to / Before dig-in / Dig-in
summary / Brought back / Continuing). Both the system and user prompts are markdown templates
in the core pack (`packs/core/prompts/sumup-system.md`, `sumup-user.md`); the user template
carries `{{resumePoint}}`, `{{topic}}`, and `{{baseContext}}` placeholders that
`session-sumup-builder` fills at runtime, so prompt wording is editable without code changes.

---

## 12. Process Lifecycle

Processes are markdown-defined but lifecycle-managed by the kernel.

- **Discovery / registry** — process specs under `specs/processes/` are loaded into the
  `SpecRegistry`; `listProcesses` builds a lightweight index (excluding the `core.process`
  spec-kind definition itself).
- **User commands** — `/process` (= `list`), `/process list`, `/process start <id>`,
  `/process status`, `/process complete`, `/process cancel [reason]`.
- **Agent tools** — `process.start`, `process.complete`, `process.cancel`, `process.status`,
  `process.list`. Agent-started processes respect activation policy: a `manual` process
  cannot be started by the agent.
- **State** — starting a process creates a `ProcessInstance` and sets it active; the full
  spec is then loaded into context. Completing or cancelling clears the active process and
  records output summary / reason.

Mode is the broad session posture; a process is a temporary, layered method that refines —
never replaces — the active mode.

---

## 13. Tools

Tools are defined once (`AiricToolDefinition`) and surfaced to the agent through
`KernelToolRegistry`. Each definition carries a JSON input schema, a `kind`
(`read`/`edit`/`search`/`execute`/…), optional `policy: "mutating"`, optional
`confirmation: "diff"`, an optional `sequential` flag, an optional `present()` for ACP tool
cards, and an `execute()`.

Workspace tools:

```text
read(path, offset?, limit?)
ls(path?)
find(pattern, path?, limit?)
grep(pattern, path?, glob?, ignoreCase?, literal?, context?, limit?)
edit(path, edits[])      # exact oldText/newText replacement; requires confirmation
write(path, content)     # create/overwrite; requires confirmation
bash(command, timeout?)
```

Process tools: `process.start`, `process.complete`, `process.cancel`, `process.status`,
`process.list`.

### Contract vs usage

Code owns the callable contract (name, JSON schema, terse `description`, policy/confirmation
flags). Usage methodology lives in `core.tool` documents under `packs/core/tools/` and is
injected as `## Tool Usage` on every turn. Scenario packs may describe creative cross-tool
patterns in mode or process prose without replacing `core.tool` docs.

### Edit pipeline (reviewable by default)

For tools with `confirmation: "diff"` (`edit`, `write`):

1. The tool produces a diff result (old/new text + unified patch) without writing.
2. `ToolExecutor` routes mutating tools through a `ToolPolicyPort` check (default
   `AllowAllToolPolicy`).
3. `MutationCoordinator` proposes the edit (`ProposeFileEditUseCase` → `EditStore`).
4. The permission gate asks the ACP client (`session/request_permission`) with the diff.
5. On allow, `ApplyFileEditUseCase` writes the file and appends a JSON line to
   `.airic/logs/edits.log`; on reject, the pending edit is discarded.
6. After a successful edit the session's `currentDocument` is updated to the edited file.

A per-path mutation queue serializes concurrent writes, and edits preserve the original
BOM / line endings.

---

## 14. LLM Configuration and Providers

`PiModelResolver` supports `openai`, `anthropic`, and `openrouter` natively, plus an
`openai-compatible` provider for any OpenAI-style endpoint (Ollama, vLLM, cloud gateways).
For `openai-compatible`, a stable provider id is derived from `base_url` so different
endpoints stay isolated.

API keys resolve from config `api_key` first, then a provider-specific environment variable
(`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`; OpenAI-compatible falls back to
`OPENAI_API_KEY`).

`config.yml` (current example):

```yaml
default_mode: core.thinking-partner

llm:
  provider: openai-compatible
  model: ark-code-latest
  base_url: https://ark.cn-beijing.volces.com/api/coding/v3
  # temperature, max_tokens, thinking_level are optional
  #   thinking_level: off | minimal | low | medium | high | xhigh

packs:
  core: .airic/packs/core

spec_paths:
  modes: .airic/specs/modes
  document_types: .airic/specs/document-types
  processes: .airic/specs/processes

editing:
  require_confirmation: true

cache:
  enabled: true
```

Config defaults (when omitted): `provider: openai`, `model: gpt-4o`, `temperature: 0.7`,
`max_tokens: 4096`, `thinking_level: off`.

---

## 15. UI Integration (ACP)

Airic is UI-agnostic; the ACP adapter is the only client surface today.

Implemented ACP surface:

```text
initialize                 -> capabilities + agentInfo (name: airic)
authenticate               -> no-op
session/new                -> bootstrap workspace, create session, advertise modes
                              and (async) available slash commands
session/set_mode           -> SelectModeUseCase
session/prompt             -> SendMessageUseCase; streams agent_message_chunk and
                              tool_call / tool_call_update notifications
session/cancel             -> abort the active prompt
session/request_permission -> edit confirmation (allow / reject)
document/didOpen,
document/didFocus          -> set currentDocument (+ doc_type spec)
```

Kernel events map to ACP session updates: `text_delta → agent_message_chunk`,
`tool_call_start → tool_call`, `tool_call_end → tool_call_update`. Slash commands are
advertised via `available_commands_update` after `session/new`.

Responsibilities:

```text
Kernel:  runtime loop, context building, tool execution, session/turn-tree state, processes
UI (ACP client): chat interface, file view/edit, diff acceptance, command autocomplete
```

---

## 16. Design Principle: Behavior in Documents, Mechanism in Code

Airic's defining feature is that **agent behavior is defined by documents**, not compiled into
the kernel. This is not a vague aspiration; it is enforced as a strict layering rule that
separates what is editable from what is not.

### Behavior strategy → documents (editable, extensible)

Everything that shapes *how the agent should think and act* lives in pack markdown and can be
read, edited, or extended without touching code:

- `base-instruction.md` — kernel identity and base posture
- `core.mode` — session thinking style
- `core.process` — repeatable workflows with lifecycle
- `core.document-type` — quality bar for user documents
- `core.tool` — usage methodology for each system tool
- `prompts/*.md` — kernel-owned prompt templates (e.g. `/sumup`)

A scenario pack layers new behavior on top: it can introduce new modes, processes, document
types, and cross-tool creative usage as ordinary prose. The kernel loads and assembles these;
it does not hard-code their content.

### Mechanism → code (transparent, but not document-editable)

The *runtime machinery* that loads documents, builds context, runs the loop, and executes tools
stays in code. This includes:

- The system-prompt **skeleton** in `RuntimeContextBuilder` — section titles
  (`## Active Mode`, `## Tool Usage`, …) and assembly order. This is the context framework's
  contract: adding a `RuntimeContextInput` field requires a code change here.
- Tool **callable contracts** — name, JSON schema, one-line `description`, policy/confirmation
  flags. These must stay coupled to the implementation.
- Command replies and UI text (`"Started process: …"`, `"Digging into: …"`, process index
  formatting). These are mechanism outputs, not behavior strategy.

This code is **transparent and readable** — `buildSystemPrompt` is one short function, the tool
contracts are plain objects — so anyone can understand "how the kernel assembles a prompt" by
reading it. But it is intentionally **not document-editable**, because decoupling it from code
would reintroduce the drift problem: a second, stale description of how context is built.

### The dividing line

```text
What the agent should do      → documents   (editable, extensible, per-scenario)
How the kernel runs           → code        (transparent, coupled, not user-editable)
```

When a prompt or rule is hardcoded in code, ask which side it falls on:

- If it is *behavior strategy* (how to think, when to use a tool, what a good document looks
  like), it belongs in a document — extract it.
- If it is *mechanism* (context skeleton, tool signature, command output), it belongs in code —
  keep it, and do not duplicate it into a document that will drift.

This rule is what makes Airic's runtime transparent *and* extensible: behavior is openly
editable in markdown, while the machinery that loads it is openly readable in code, and the two
never pretend to own each other's concerns.

---

## 17. Testing

`vitest` covers the kernel across layers, including: turn-tree behavior, runtime context
building, `SendMessageUseCase`, process catalog + lifecycle, kernel tool registry, file tools
and the edit pipeline, diff service, frontmatter parsing, the Pi transcript mapper and model
resolver, mode/command catalogs, and workspace bootstrap.

```bash
npm test          # vitest run
npm run build     # tsc
npm run dev       # tsx src/main.ts (ACP over stdio)
```

When running the server for manual testing, allow filesystem/network permissions (use the
unrestricted dev task) so permission prompts do not block startup.

---

## 18. Key Design Invariants

- **Workspace ownership** — Airic owns only `.airic/`; user files get no hidden metadata.
- **Behavior in documents, mechanism in code** — see §16. Behavior strategy is editable in pack
  markdown; runtime machinery stays coupled and transparent in code.
- **Spec simplicity** — specs are prose + minimal frontmatter, indexed by id; no DSL.
- **Explicit `doc_type`** — document-type-aware editing requires an explicit frontmatter
  declaration.
- **Core pack provides base instruction** and default specs; user edits are preserved on sync.
- **Reviewable edits** — mutating file tools propose a diff and require confirmation, then log.
- **Anti-pollution history** — model context follows the cursor path; digressions and tool
  traces are excluded by default.
- **Layered processes** — a process refines, never replaces, the active mode; only one is
  active at a time.
- **Replaceable boundaries** — ACP, LLM, filesystem, and session storage sit behind ports.

---

## 19. Summary

Airic Kernel is a Clean Architecture monolith that turns markdown specs + a core pack +
runtime context into agent behavior, and serves it to editors over ACP.

```text
ACP chat + streaming
+ reviewable, audited file tools + bash
+ markdown modes / document-types / processes
+ turn-tree history with /digin and /sumup
+ kernel-managed process lifecycle
+ multi-provider LLM access
```
