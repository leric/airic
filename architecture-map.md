# Architecture Map — Airic

- Last updated: 2026-06-24
- Architectural decision owners: project maintainers (human review for new ports, use cases, owned concepts)

## Layer layout

| Layer | Location | Notes |
|---|---|---|
| Entities / domain | `src/domain/` | Session, specs, tool contracts, workspace path rules. No Pi/ACP/Node fs types in tool domain. |
| Use cases / application | `src/application/use-cases/` | Send message, file editing, bootstrap. |
| Application services | `src/application/services/` | Runtime context, tool executor, mutation coordinator, Pi bridge. |
| Ports | `src/application/ports/` | FileSystem, SessionStore, AgentRuntime, ToolPolicy, ToolRegistry, ToolExecutor, … |
| Adapters (infrastructure) | `src/infrastructure/` | Pi agent runtime, Node fs, tools, diff, config, store. |
| Delivery (ACP) | `src/interfaces/acp/` | ACP adapter, event mappers, message mappers. |
| Persistence | `src/infrastructure/store/` | JSON session store, edit log on disk. |
| Tests | `tests/` | Unit tests mirror `src/` routes. |

## Use case catalog

| Use case | Purpose | Location | Ports used | Key entities |
|---|---|---|---|---|
| Send message | Run one agent turn with tools | `use-cases/send-message.ts` | AgentRuntimePort, SessionStorePort, KernelToolRegistryPort | Session, Transcript |
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

Agent-facing tool names: `read`, `ls`, `find`, `grep`, `edit`, `write`, `bash`.

| Concern | Owner | Location |
|---|---|---|
| Tool contract (result, kind, policy, confirmation, present) | domain | `src/domain/tool/` |
| Tool registry lookup | application port | `ports/tool-registry-port.ts` |
| Generic execution + policy | application | `services/tool-executor.ts` |
| Edit/write confirmation + apply | application | `services/mutation-coordinator.ts` |
| Pi runtime bridge | application | `services/kernel-tool-registry.ts` |
| Tool implementations | infrastructure | `src/infrastructure/tools/file/`, `shell/` |
| Composition root (registry + executor + Pi bridge) | infrastructure | `create-tool-registry.ts`, `create-tool-runtime.ts` |
| ACP diff mapping | delivery | `interfaces/acp/acp-tool-event-mapper.ts` |

**Naming note:** `KernelToolRegistry` is the Pi Agent Core adapter. The design doc calls this `AiricToolRegistry`; same role.

**Modification closure for a new tool:**

1. Implement `createMyTool(deps?)` returning `AiricToolDefinition` in `src/infrastructure/tools/`
2. Register in `createDefaultToolRegistry()` — one line
3. Add tests in `tests/tools.test.ts`
4. Optional: add name to `domain/tool/tool-names.ts` for test constants

Do **not** modify `ToolExecutor` or `KernelToolRegistry` when adding a standard tool.

## Core entities & invariants

| Entity | Owns | Location |
|---|---|---|
| Session | workspace root, transcript, current document | `domain/session/` |
| PendingEdit | proposed mutation before user accept | `domain/tool/pending-edit.ts` |
| AiricToolDefinition | tool metadata + execute + optional present | `domain/tool/tool.ts` |
| AiricToolResult | tool output shape (text, diff, terminal) | `domain/tool/tool-result.ts` |
| Workspace path | paths must not escape workspace root | `domain/path/workspace-path.ts` |

## Conventions & placement rules

- New use case → `src/application/use-cases/`, depend on ports not adapters.
- New port → `src/application/ports/`, shaped by use-case need not provider API.
- New tool → `create*Tool()` factory + register in `createDefaultToolRegistry()`.
- Wire runtime → `createKernelToolStack(deps)` at composition root (ACP adapter, send-message default).
- Workspace path resolution → `domain/path/workspace-path.ts`.
- Dependency direction: domain ← application ← infrastructure; interfaces/acp calls application.

## Boundary debts

| Boundary | Problem | Risk if bypassed | Status |
|---|---|---|---|
| MutationCoordinator → mutation-apply | Application imports one infrastructure helper for queued writes | Coupling isolated to coordinator | Accepted |
| Pi content model vs AiricToolResult | `_airicResult` in `pi-agent-runtime` details | ACP diff lost if removed | Documented in code |
| ToolExecutor → infrastructure | Executor has no tool imports; registry factory lives in infrastructure | Clean separation achieved | Resolved |

## Open ownership questions

| Capability | Candidate owners | Decision needed |
|---|---|---|
| ACP diff for in-progress edit preview | ACP adapter vs tool executor | Deferred; v0.1 uses permission gate on completed diff only |
