# Architecture Map — Airic

- Last updated: 2026-06-25
- Architectural decision owners: project maintainers (human review for new ports, use cases, owned concepts)

## Layer layout

| Layer | Location | Notes |
|---|---|---|
| Entities / domain | `src/domain/` | Session, specs, tool contracts, workspace path rules. No Pi/ACP/Node fs types in tool domain. |
| Use cases / application | `src/application/use-cases/` | Send message, file editing, bootstrap. |
| Application services | `src/application/services/` | Runtime context (system prompt), tool executor, mutation coordinator, Pi bridge. |
| Ports | `src/application/ports/` | FileSystem, SessionStore, AgentRuntime, ToolPolicy, ToolRegistry, ToolExecutor, … |
| Adapters (infrastructure) | `src/infrastructure/` | Pi agent runtime, Node fs, tools, diff, config, store. |
| Delivery (ACP) | `src/interfaces/acp/` | ACP adapter, event mappers, message mappers. |
| Persistence | `src/infrastructure/store/` | JSON session store, edit log on disk. |
| Tests | `tests/` | Unit tests mirror `src/` routes. |

## Use case catalog

| Use case | Purpose | Location | Ports used | Key entities |
|---|---|---|---|---|
| Send message | Run one agent turn with tools; dispatch slash commands (`/tree`, `/process …`) | `use-cases/send-message.ts` | AgentRuntimePort, SessionStorePort, KernelToolRegistryPort (required, wired at composition root) | Session, TurnNode, ProcessInstance |
| Select mode | Switch session thinking mode via ACP `session/set_mode` | `use-cases/select-mode.ts` | SessionStorePort, WorkspaceRuntime (specRegistry) | Session |
| Propose / apply edit | User-confirmed file mutation | `use-cases/file-editing.ts` | FileSystemPort, SessionStorePort | PendingEdit |
| Bootstrap workspace | Initialize `.airic/` layout | `use-cases/bootstrap-workspace.ts` | FileSystemPort | — |
| Open document | Set current document + doc_type | `use-cases/file-editing.ts` | FileSystemPort, SpecRegistry | Session |

## Ports & adapters registry

| Port | Capability | Location | Adapters | Contract test |
|---|---|---|---|---|
| FileSystemPort | Read/write/list/search workspace files | `ports/file-system-port.ts` | `NodeFileSystem` | via tool tests |
| ToolRegistryPort | Lookup tool definitions by name | `ports/tool-registry-port.ts` | `AiricToolRegistry` via `createDefaultToolRegistry()` | `tests/kernel-tool-registry.test.ts` |
| ToolExecutorPort | Execute agent tools by name | `ports/tool-executor-port.ts` | `ToolExecutor` | `tests/tools.test.ts` |
| ToolPolicyPort | Allow/deny mutating tools | `ports/tool-policy-port.ts` | `AllowAllToolPolicy` | `tests/tools.test.ts` |
| KernelToolRegistryPort | Tool defs + Pi handler bridge | `services/kernel-tool-registry.ts` | `KernelToolRegistry` | `tests/kernel-tool-registry.test.ts` |
| AgentRuntimePort | LLM turn + tool rounds | `ports/agent-runtime-port.ts` | `PiAgentRuntime` | `tests/send-message.test.ts` |
| SessionStorePort | Persist session state | `ports/session-store-port.ts` | `JsonSessionStore` | integration tests |

## Tool layer routing

Agent-facing tool names: `read`, `ls`, `find`, `grep`, `edit`, `write`, `bash`, `process.start`, `process.complete`, `process.cancel`, `process.status`, `process.list`.

| Concern | Owner | Location |
|---|---|---|
| Tool contract (result, kind, policy, confirmation, present) | domain | `src/domain/tool/` |
| Tool registry lookup | application port | `ports/tool-registry-port.ts` |
| Generic execution + policy | application | `services/tool-executor.ts` |
| Edit/write confirmation + apply | application | `services/mutation-coordinator.ts` |
| Pi runtime bridge | application | `services/kernel-tool-registry.ts` |
| Tool implementations | infrastructure | `src/infrastructure/tools/file/`, `shell/`, `process/` |
| Composition root (registry + executor + Pi bridge) | infrastructure | `create-tool-registry.ts`, `create-tool-runtime.ts` |
| ACP diff mapping | delivery | `interfaces/acp/acp-tool-event-mapper.ts` |

**Naming note:** `KernelToolRegistry` is the Pi Agent Core adapter. The design doc calls this `AiricToolRegistry`; same role.

**Modification closure for a new tool:**

1. Implement `createMyTool(deps?)` returning `AiricToolDefinition` in `src/infrastructure/tools/`
2. Register in `createDefaultToolRegistry()` — one line
3. Add the tool name to `KERNEL_TOOL_NAMES` in `domain/tool/tool-names.ts`
4. Add a matching `core.tool` usage doc under `.airic/packs/core/tools/<name>.md` in the repo (bootstrap copies the bundled pack into new workspaces; edit the repo file only)
5. Add tests in `tests/tools.test.ts`
6. Verify `tests/tool-usage-catalog.test.ts` sync guard passes (every `ALL_KERNEL_TOOL_NAMES` entry has exactly one `core.tool` doc)

Do **not** modify `ToolExecutor` or `KernelToolRegistry` when adding a standard tool.

## Core entities & invariants

| Entity | Owns | Location |
|---|---|---|
| Session | workspace root, turn tree (cursor), current document, active mode, process instances | `domain/session/` — spec: [docs/kernel-tdd.md](docs/kernel-tdd.md) §8, §11, §12 |
| TurnNode | one user+assistant exchange in the session tree | `domain/session/turn-node.ts` |
| ProcessInstance | one process workflow run (active / completed / cancelled) | `domain/session/session.ts` |
| PendingEdit | proposed mutation before user accept | `domain/tool/pending-edit.ts` |
| AiricToolDefinition | tool metadata + execute + optional present | `domain/tool/tool.ts` |
| core.tool spec | single-tool usage methodology (1:1 via `tool:` frontmatter) | `packs/core/tools/` → `SpecRegistry` |
| core.tool kind | meta definition of the `core.tool` doc type | `packs/core/document-types/tool.md` |
| AiricToolResult | tool output shape (text, diff, terminal) | `domain/tool/tool-result.ts` |
| Workspace path | paths must not escape workspace root | `domain/path/workspace-path.ts` |

## Conventions & placement rules

- New use case → `src/application/use-cases/`, depend on ports not adapters.
- New port → `src/application/ports/`, shaped by use-case need not provider API.
- New tool → `create*Tool()` factory + register in `createDefaultToolRegistry()`.
- Wire runtime → `createKernelToolStack(deps)` at composition root only (`interfaces/acp/acp-adapter.ts`). Use cases must not import infrastructure factories.
- Workspace path resolution → `domain/path/workspace-path.ts`.
- Session history → turn tree in `domain/session/turn-tree.ts`; model context uses `projectCursorPath()` (active cursor path only; sibling branches and `toolTrace` excluded). System prompt only → `RuntimeContextBuilder` (base instruction + active mode spec + process index or active process spec + always-resident Tool Usage + current document).
- Tool usage docs → `core.tool` specs in `packs/core/tools/` (pack-resident, no override/sync to specs). Loaded by `WorkspaceRuntimeLoader` into `SpecRegistry`. Injected via `tool-usage-catalog.ts` → `RuntimeContextBuilder` `## Tool Usage` section. One-to-one binding via frontmatter `tool:`; sync guard: `tests/tool-usage-catalog.test.ts` (every `ALL_KERNEL_TOOL_NAMES` entry has a doc). Cross-tool creative usage stays in mode/process prose.
- Available modes → `application/services/mode-catalog.ts` (`listAvailableModes` from spec registry `core.mode` docs). ACP `session/new` returns `modes`; `session/set_mode` → `SelectModeUseCase`.
- Process lifecycle → `application/services/process-lifecycle.ts` (start / complete / cancel / status on `Session`). Discovery/index → `application/services/process-catalog.ts`. User slash commands → `domain/session/session-command.ts` + `SendMessageUseCase.handleProcess`. Agent tools → `infrastructure/tools/process/`. Spec: [docs/kernel-tdd.md](docs/kernel-tdd.md) §12.
- Slash commands (kernel) → parse in `domain/session/session-command.ts`; advertise via `application/services/command-catalog.ts` + ACP `available_commands_update` in `interfaces/acp/acp-command-catalog.ts` after `session/new`. **Keep parse list and catalog list in sync** — test: `tests/command-catalog.test.ts`.
- Process state after agent tools → `SendMessageUseCase.handleMessage` reloads session and calls `mergeProcessState` before final save (tools only receive `sessionId`, not in-memory session).
- Session tree field defaults → `domain/session/ensure-session-tree.ts` (in-memory) and `JsonSessionStore.get()` (persistence).
- Dependency direction: domain ← application ← infrastructure; interfaces/acp calls application.

## Boundary debts

| Boundary | Problem | Risk if bypassed | Status |
|---|---|---|---|
| MutationCoordinator → mutation-apply | Application imports one infrastructure helper for queued writes | Coupling isolated to coordinator | Accepted |
| Pi content model vs AiricToolResult | `_airicResult` in `pi-agent-runtime` details | ACP diff lost if removed | Documented in code |
| ToolExecutor → infrastructure | Executor has no tool imports; registry factory lives in infrastructure | Clean separation achieved | Resolved |
| SendMessageUseCase → infrastructure | Use case previously defaulted `createKernelToolStack` internally | Layer bypass copied by future use cases | Resolved — `kernelTools` required; wired in ACP adapter |
| Process tools → sessionStore | Tools load-mutate-save session; use case merges process state after turn | Dropped process changes if merge removed | Documented in `send-message.ts` + architecture map |

## Open ownership questions

| Capability | Candidate owners | Decision needed |
|---|---|---|
| ACP diff for in-progress edit preview | ACP adapter vs tool executor | Deferred; v0.1 uses permission gate on completed diff only |
| Canonical slash command registry | `session-command.ts` (parse) vs `command-catalog.ts` (advertise) | Deferred; cross-linked + sync test for now; consolidate if commands grow |
