# Architecture Map — Airic

- Last updated: 2026-06-24
- Architectural decision owners: project maintainers (human review for new ports, use cases, owned concepts)

## Layer layout

| Layer | Location | Notes |
|---|---|---|
| Entities / domain | `src/domain/` | Session, specs, tool contracts, workspace path rules. No Pi/ACP/Node fs types in tool domain. |
| Use cases / application | `src/application/use-cases/` | Send message, file editing, bootstrap. |
| Application services | `src/application/services/` | Runtime context, spec registry, tool registry bridge. |
| Ports | `src/application/ports/` | FileSystem, SessionStore, AgentRuntime, ToolPolicy, ToolExecutor, … |
| Adapters (infrastructure) | `src/infrastructure/` | Pi agent runtime, Node fs, tools, diff, config, store. |
| Delivery (ACP) | `src/interfaces/acp/` | ACP adapter, event mappers, message mappers. |
| Persistence | `src/infrastructure/store/` | JSON session store, edit log on disk. |
| Tests | `tests/` | Unit tests mirror `src/` routes. |

## Use case catalog

| Use case | Purpose | Location | Ports used | Key entities |
|---|---|---|---|---|
| Send message | Run one agent turn with tools | `use-cases/send-message.ts` | AgentRuntimePort, SessionStorePort, ToolExecutor (via KernelToolRegistry) | Session, Transcript |
| Propose / apply edit | User-confirmed file mutation | `use-cases/file-editing.ts` | FileSystemPort, SessionStorePort | PendingEdit |
| Bootstrap workspace | Initialize `.airic/` layout | `use-cases/bootstrap-workspace.ts` | FileSystemPort | — |
| Open document | Set current document + doc_type | `use-cases/file-editing.ts` | FileSystemPort, SpecRegistry | Session |

## Ports & adapters registry

| Port | Capability | Location | Adapters | Contract test |
|---|---|---|---|---|
| FileSystemPort | Read/write/list/search workspace files | `ports/file-system-port.ts` | `NodeFileSystem` | via tool tests |
| ToolExecutorPort | Execute agent tools by name | `ports/tool-executor-port.ts` | `AiricToolExecutor` | `tests/tools.test.ts` |
| ToolPolicyPort | Allow/deny/request permission for mutating tools | `ports/tool-policy-port.ts` | `AllowAllToolPolicy` | `tests/tools.test.ts` |
| KernelToolRegistryPort | Tool defs + Pi handler bridge | `services/kernel-tool-registry.ts` | `KernelToolRegistry` | `tests/kernel-tool-registry.test.ts` |
| AgentRuntimePort | LLM turn + tool rounds | `ports/agent-runtime-port.ts` | `PiAgentRuntime` | `tests/send-message.test.ts` |
| SessionStorePort | Persist session state | `ports/session-store-port.ts` | `JsonSessionStore` | integration tests |

## Tool layer routing

Agent-facing tool names: `read`, `ls`, `find`, `grep`, `edit`, `write`, `bash`.

| Concern | Owner | Location |
|---|---|---|
| Tool contract (result, kind, policy input) | domain | `src/domain/tool/` |
| Tool execution orchestration + policy + edit permission | application | `src/application/services/airic-tool-executor.ts` |
| Pi runtime bridge (defs, presentation, handler) | application | `src/application/services/kernel-tool-registry.ts` |
| Tool implementations (Pi-inspired) | infrastructure | `src/infrastructure/tools/` |
| ACP diff / content mapping | delivery | `src/interfaces/acp/acp-tool-event-mapper.ts` |

**Naming note:** `KernelToolRegistry` is the Pi Agent Core adapter for tool registration. The design doc (`docs/tools-plan.md`) calls this `AiricToolRegistry`; same role, different name kept for Pi integration clarity.

**Modification closure for a new tool:**

1. Implement `execute*Tool` in `src/infrastructure/tools/`
2. Register in `AiricToolExecutor.execute()` switch
3. Add definition + presentation in `kernel-tool-registry.ts`
4. Add `KERNEL_TOOL_NAMES` entry in `domain/tool/tool-names.ts`
5. Add tests in `tests/tools.test.ts`
6. Update this map if a new port or boundary is introduced

## Core entities & invariants

| Entity | Owns | Location |
|---|---|---|
| Session | workspace root, transcript, current document | `domain/session/` |
| PendingEdit | proposed mutation before user accept | `domain/tool/pending-edit.ts` |
| AiricToolResult | tool output shape (text, diff, terminal) | `domain/tool/tool-result.ts` |
| Workspace path | paths must not escape workspace root | `domain/path/workspace-path.ts` |

## Conventions & placement rules

- New use case → `src/application/use-cases/`, depend on ports not adapters.
- New port → `src/application/ports/`, shaped by use-case need not provider API.
- New tool implementation → `src/infrastructure/tools/` (file/ or shell/); wire through `AiricToolExecutor`.
- New Pi/ACP wiring → `src/infrastructure/agent/` or `src/interfaces/acp/`.
- Workspace path resolution → `domain/path/workspace-path.ts`; application uses `PathResolver` wrapper.
- Dependency direction: domain ← application ← infrastructure; interfaces/acp calls application.
- Spec / plan docs → `docs/` (e.g. `docs/tools-plan.md`).

## Boundary debts

| Boundary | Problem | Risk if bypassed | Status |
|---|---|---|---|
| Application → infrastructure tools | `AiricToolExecutor` imports concrete `execute*Tool` functions | Hard to swap tool backend; application coupled to mechanism | Accepted v0.1; future: tool registry adapter behind port |
| Pi content model vs AiricToolResult | `_airicResult` in `pi-agent-runtime` details preserves diff content | ACP diff lost if channel removed | Documented in code; migrate when Pi adapter supports rich content |
| KernelToolRegistry → infrastructure schemas | Registry imports `*_TOOL_SCHEMA` from tool files | Schema drift between registry and executor | Accepted; schemas live with implementations |
| grep rg fallback | Requires `FileSystemPort` injected from executor | Was direct `NodeFileSystem` import | Fixed: fs injected via executor |

## Open ownership questions

| Capability | Candidate owners | Decision needed |
|---|---|---|
| Tool schema single source of truth | `kernel-tool-registry.ts` vs per-tool `*-tool.ts` exports | Keep co-located with implementation (current) or centralize definitions file? |
| ACP diff for in-progress edit preview | ACP adapter vs tool executor | Deferred; v0.1 uses permission gate on completed diff only |
