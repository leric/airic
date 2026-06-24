# Airic Tool Layer Implementation Plan

## Goal

Implement Airic v0.1 tool layer by learning from `pi-coding-agent` built-in tools.

Airic should absorb mature implementation experience from Pi, but must not adopt Pi Coding Agent as the application foundation.

Airic remains:

```text
Airic semantic layer
+ Pi Agent Core runtime adapter
+ Airic-owned tool layer
+ ACP adapter
```

Do not replace Airic Kernel with `pi-coding-agent`.

---

## Current Architectural Boundary

Keep Clean Architecture boundaries intact.

```text
domain/
  Airic concepts only.
  No Pi Coding Agent types.
  No ACP protocol types.
  No Node fs/process types.

application/
  Use cases and ports.
  Tool registry and tool policy abstractions.

infrastructure/
  Concrete tool implementations.
  Pi-inspired file/search/edit/bash code lives here.
  Pi Agent Core adapter lives here.

interfaces/acp/
  ACP message/tool/diff/terminal mapping.
```

Do not introduce Pi-specific domain concepts into `domain/`.

Forbidden in `domain/`:

```text
PiTool
PiMessage
PiAgent
PiEvent
ACPMessage
ToolCallContent
Node child_process
```

---

## Reference Sources

Read these Pi docs first:

```text
https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/sdk.md
https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/usage.md
```

Read these Pi tool implementations:

```text
https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/tools/read.ts
https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/tools/edit.ts
https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/tools/edit-diff.ts
https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/tools/file-mutation-queue.ts
https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/tools/write.ts
https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/tools/grep.ts
https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/tools/find.ts
https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/tools/ls.ts
https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/tools/bash.ts
https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/tools/path-utils.ts
https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/tools/truncate.ts
https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/tools/tool-definition-wrapper.ts
```

Read these ACP docs for UI/protocol integration:

```text
https://agentclientprotocol.com/protocol/v1/tool-calls
https://agentclientprotocol.com/protocol/v1/file-system
https://agentclientprotocol.com/protocol/v1/terminals
```

If any Pi source code is copied rather than reimplemented, preserve the MIT license/copyright notice as required.

---

## Tool Set to Implement

Expose these tool names to the model:

```text
read
ls
find
grep
edit
write
bash
```

Rationale:

* These names are familiar to coding agents.
* `grep` is better than `search_text` because the model naturally understands its semantics.
* `edit` and `write` match common agent tool conventions.
* `bash` is a general-purpose tool multiplier.

Internally, map them to Airic-owned tool semantics:

```text
read  -> file.read
ls    -> file.list
find  -> file.find
grep  -> file.grep
edit  -> file.edit
write -> file.write
bash  -> shell.run
```

---

## Target Directory Structure

Add or adapt the following structure:

```text
src/
  domain/
    tools/
      tool.ts
      tool-result.ts
      tool-policy.ts

  application/
    ports/
      tool-registry-port.ts
      tool-executor-port.ts
      tool-policy-port.ts

    services/
      airic-tool-registry.ts

  infrastructure/
    tools/
      common/
        path-utils.ts
        truncate.ts
        file-mutation-queue.ts
        tool-result-format.ts

      file/
        read-tool.ts
        ls-tool.ts
        find-tool.ts
        grep-tool.ts
        write-tool.ts
        edit-tool.ts
        edit-diff.ts

      shell/
        bash-tool.ts

  interfaces/
    acp/
      acp-tool-event-mapper.ts
      acp-diff-mapper.ts
      acp-terminal-mapper.ts
```

Exact paths can be adjusted to the current repository layout, but keep the same boundary.

---

## Core Tool Contract

Create an Airic-owned tool contract.

Do not expose Pi Coding Agent tool types directly.

Suggested shape:

```ts
export type AiricToolKind =
  | 'read'
  | 'edit'
  | 'delete'
  | 'move'
  | 'search'
  | 'execute'
  | 'other'

export type AiricToolDefinition<TInput = unknown> = {
  name: string
  kind: AiricToolKind
  description: string
  inputSchema: unknown
  promptSnippet?: string
  promptGuidelines?: string[]
  execute: (
    input: TInput,
    context: AiricToolContext,
    signal?: AbortSignal,
    onUpdate?: (update: AiricToolUpdate) => void
  ) => Promise<AiricToolResult>
}

export type AiricToolResult = {
  content: AiricToolContent[]
  details?: Record<string, unknown>
}

export type AiricToolContent =
  | { type: 'text'; text: string }
  | { type: 'diff'; path: string; oldText: string | null; newText: string }
  | { type: 'terminal'; terminalId: string }

export type AiricToolContext = {
  cwd: string
  sessionId: string
}
```

This contract is Airic-owned. Pi Agent Core adapter can map these tools into whatever runtime shape it needs.

---

## ToolPolicy Hook

Add a policy hook now, even if the first implementation allows everything.

```ts
export interface ToolPolicyPort {
  check(call: ToolPolicyCheckInput): Promise<ToolPolicyDecision>
}

export type ToolPolicyDecision =
  | { kind: 'allow' }
  | { kind: 'deny'; reason: string }
  | { kind: 'request_permission'; reason: string }
```

Initial implementation:

```ts
export class AllowAllToolPolicy implements ToolPolicyPort {
  async check() {
    return { kind: 'allow' as const }
  }
}
```

Do not build full security policy yet.

But all mutating/dangerous tools must pass through this hook:

```text
edit
write
bash
```

This allows later addition of:

```text
- command allowlist
- path boundary checks
- sensitive path blocklist
- write confirmation
- bash approval
- network policy
```

without changing tool implementation contracts.

---

## Tool 1: read

Reference:

```text
packages/coding-agent/src/core/tools/read.ts
packages/coding-agent/src/core/tools/truncate.ts
packages/coding-agent/src/core/tools/path-utils.ts
```

Implement:

```text
read(path, offset?, limit?)
```

Absorb from Pi:

```text
- offset / limit
- 1-based line offsets
- max line and max byte truncation
- continuation hint
- path normalization relative to cwd
- AbortSignal support
- readable error messages
```

Do not absorb yet:

```text
- TUI rendering
- syntax highlighting
- compact resource classification
- image support unless trivial
- Pi docs / skill special casing
```

Output should be text content only for v0.1.

---

## Tool 2: ls

Reference:

```text
packages/coding-agent/src/core/tools/ls.ts
packages/coding-agent/src/core/tools/path-utils.ts
packages/coding-agent/src/core/tools/truncate.ts
```

Implement:

```text
ls(path?)
```

Absorb from Pi:

```text
- relative path resolution
- directory entries sorted deterministically
- directory entries should have trailing slash
- include dotfiles
- reasonable result limit
- truncation notice
```

Do not absorb:

```text
- TUI rendering
- keybinding hints
- theme handling
```

---

## Tool 3: find

Reference:

```text
packages/coding-agent/src/core/tools/find.ts
```

Implement:

```text
find(pattern, path?, limit?)
```

Absorb from Pi:

```text
- glob semantics
- respect .gitignore
- use fd when available
- output paths relative to search root
- max result limit
- byte truncation
- AbortSignal support
```

Do not absorb:

```text
- auto-download behavior unless already present in project
- TUI rendering
```

Fallback behavior:

```text
If fd is unavailable, use a simple Node-based glob fallback.
```

---

## Tool 4: grep

Reference:

```text
packages/coding-agent/src/core/tools/grep.ts
```

Implement:

```text
grep(pattern, path?, glob?, ignoreCase?, literal?, context?, limit?)
```

Absorb from Pi:

```text
- use ripgrep when available
- respect .gitignore
- path + line number output
- literal mode
- ignoreCase
- glob filter
- context lines
- match limit
- long-line truncation
- byte truncation
- “refine pattern or increase limit” notices
```

Do not absorb:

```text
- TUI rendering
- color/theme formatting
```

Fallback behavior:

```text
If rg is unavailable, use a simple Node-based recursive text search fallback.
```

Tool naming:

```text
Expose this tool as `grep`, not `search_text`.
```

---

## Tool 5: edit

Reference:

```text
packages/coding-agent/src/core/tools/edit.ts
packages/coding-agent/src/core/tools/edit-diff.ts
packages/coding-agent/src/core/tools/file-mutation-queue.ts
```

Implement:

```text
edit(path, edits[])
```

Input shape:

```ts
{
  path: string
  edits: Array<{
    oldText: string
    newText: string
  }>
}
```

Absorb from Pi:

```text
- exact oldText -> newText replacement
- oldText must be unique
- edits must be non-overlapping
- multiple replacements in one call
- match all edits against the original file, not incrementally
- fuzzy normalization as implemented in Pi edit-diff
- line ending detection
- LF normalization and original line ending restoration
- UTF-8 BOM handling
- no-op detection
- duplicate match detection
- standard unified patch generation
- display diff generation
- firstChangedLine
- file mutation queue
```

Modify for Airic:

```text
- Integrate with ACP diff content.
- Before writing, generate diff content:
  { type: "diff", path, oldText, newText }
- Map this to ACP tool_call content so the IDE can show the diff.
- Keep the tool policy hook before mutation.
```

Execution behavior for v0.1:

```text
1. Read original file.
2. Compute new content using Pi-inspired edit-diff logic.
3. Generate:
   - ACP diff content
   - display diff
   - unified patch
   - firstChangedLine
4. Pass through ToolPolicy.
5. If allowed, write the file.
6. Return result with details.diff, details.patch, details.firstChangedLine.
```

Do not absorb:

```text
- Pi TUI diff rendering
- Box/Text/Container render components
- keybinding hints
- Pi-specific legacy rendering logic
```

Important:

```text
Do not make the LLM produce raw patches as the primary interface.
Use oldText/newText replacement, because it is easier for the model and easier to validate.
```

---

## Tool 6: write

Reference:

```text
packages/coding-agent/src/core/tools/write.ts
packages/coding-agent/src/core/tools/file-mutation-queue.ts
```

Implement:

```text
write(path, content)
```

Absorb from Pi:

```text
- create parent directories recursively
- overwrite existing file if present
- file mutation queue
- AbortSignal handling around async fs calls
```

Modify for Airic:

```text
- Before writing, if file exists, read old content and emit ACP diff:
  { type: "diff", path, oldText, newText: content }
- If file does not exist, emit ACP diff:
  { type: "diff", path, oldText: null, newText: content }
- Pass through ToolPolicy before mutation.
```

Do not absorb:

```text
- TUI preview rendering
- incremental syntax highlighting
- theme logic
```

---

## Tool 7: bash

Reference:

```text
packages/coding-agent/src/core/tools/bash.ts
```

Implement:

```text
bash(command, timeout?)
```

Or, if Pi uses separate fields, follow Pi’s input schema.

Absorb from Pi as much as practical:

```text
- local subprocess execution
- cwd support
- stdout/stderr capture
- streaming update support
- timeout
- AbortSignal
- process termination
- output truncation
- clear error messages
```

For v0.1:

```text
- Allow bash by default in local dogfood mode.
- Still route every bash call through ToolPolicy.
- Use AllowAllToolPolicy initially.
```

Do not implement yet:

```text
- command allowlist
- network restrictions
- sandbox
- Docker/container execution
- ACP terminal backend as the primary implementation
```

ACP terminal integration can be added later.

But structure the output so ACP can display bash as an `execute` tool call.

Optional later route:

```text
If ACP client terminal capability is available, bash can be reimplemented via:
terminal/create
terminal/output
terminal/wait_for_exit
terminal/kill
terminal/release
```

Do not do this in the first task unless it is trivial.

---

## ACP Integration

Reference:

```text
https://agentclientprotocol.com/protocol/v1/tool-calls
https://agentclientprotocol.com/protocol/v1/file-system
https://agentclientprotocol.com/protocol/v1/terminals
```

Implement mapping from Airic tool events to ACP tool calls.

Tool kind mapping:

```text
read  -> read
ls    -> read or search
find  -> search
grep  -> search
edit  -> edit
write -> edit
bash  -> execute
```

For `edit` and `write`, include ACP diff content:

```ts
{
  type: 'diff',
  path: absolutePath,
  oldText: oldContentOrNull,
  newText: newContent
}
```

For `bash`, report it as an `execute` tool call.

Do not depend on ACP client filesystem for the first implementation.

Use local Node fs first.

Later, if client fs capabilities are available, `read` and `write` may optionally route through:

```text
fs/read_text_file
fs/write_text_file
```

This is useful because ACP client fs can include unsaved editor state, but it should not block the first implementation.

---

## What to Absorb from Pi

Absorb:

```text
- Mature tool names: read, ls, find, grep, edit, write, bash
- Tool descriptions and prompt guidance style
- Exact replacement edit model
- Multi-edit validation
- Diff and patch generation
- File mutation queue
- Offset/limit reading
- Output truncation
- rg/fd-backed search
- AbortSignal handling
- subprocess timeout/output handling
- Pluggable operations idea, where useful
```

---

## What Not to Absorb from Pi

Do not absorb:

```text
- Pi Coding Agent as the product foundation
- Pi CLI/TUI assumptions
- Pi package/resource/skill semantics
- .pi directory conventions
- Pi TUI rendering components
- theme/color/keybinding logic
- Pi-specific AGENTS.md / CLAUDE.md / SKILL.md special handling
- Pi extension discovery
- Pi prompt template system
- Pi settings manager
- Pi session manager
```

Airic’s first-class concepts remain:

```text
.airic/
role spec
document-type spec
process spec
current_document
doc_type-aware editing
ACP-first interaction
```

---

## Implementation Order

### Phase 1: Tool Contract and Registry

Implement:

```text
AiricToolDefinition
AiricToolResult
AiricToolContent
ToolPolicyPort
AllowAllToolPolicy
AiricToolRegistry
```

Acceptance:

```text
- Tools can be registered by name.
- Tools can be listed for the agent runtime.
- Every tool call can pass through ToolPolicy.
```

---

### Phase 2: Read-only Workspace Tools

Implement:

```text
read
ls
find
grep
```

Acceptance:

```text
- Agent can inspect files without bash.
- read supports offset/limit.
- find supports glob.
- grep supports pattern + path + glob + context.
- Output is truncated with actionable continuation/refinement hints.
```

---

### Phase 3: File Mutation Tools

Implement:

```text
edit
write
file-mutation-queue
edit-diff utilities
ACP diff mapping
```

Acceptance:

```text
- edit can apply one exact replacement.
- edit can apply multiple non-overlapping replacements.
- edit rejects duplicate oldText.
- edit rejects missing oldText.
- edit rejects overlapping edits.
- edit preserves line endings.
- edit returns details.diff and details.patch.
- edit emits ACP diff content.
- write creates parent directories.
- write emits ACP diff content.
```

---

### Phase 4: Bash Tool

Implement:

```text
bash
```

Acceptance:

```text
- bash runs in workspace cwd.
- bash captures stdout/stderr.
- bash supports timeout.
- bash supports AbortSignal.
- bash truncates long output.
- bash reports execution as ACP execute tool call.
- bash passes through ToolPolicy, even if current policy allows all.
```

---

### Phase 5: ACP Tool Event Mapping

Implement:

```text
acp-tool-event-mapper
acp-diff-mapper
```

Acceptance:

```text
- read/ls/find/grep show appropriate tool call kinds.
- edit/write show diff content in ACP.
- bash shows execute progress.
- failed tools return useful error messages to the model and user.
```

---

## Test Plan

Add unit tests for:

```text
read:
  - reads file
  - offset works
  - limit works
  - large file truncates

find:
  - finds glob results
  - respects path root
  - returns stable relative paths

grep:
  - finds matches with line numbers
  - literal mode works
  - ignoreCase works
  - context lines work
  - limit works

edit:
  - single replacement
  - multiple replacements
  - duplicate oldText rejected
  - missing oldText rejected
  - overlapping edits rejected
  - no-op rejected
  - line endings preserved
  - unified patch generated

write:
  - creates new file
  - creates parent directories
  - overwrites existing file
  - emits diff content

bash:
  - runs simple command
  - captures stdout
  - captures stderr
  - handles non-zero exit
  - timeout kills command
```

Add integration tests for:

```text
- Airic tool registry exposes read/ls/find/grep/edit/write/bash.
- ToolPolicy is invoked for edit/write/bash.
- ACP mapper converts edit/write output to diff content.
```

---

## Success Criteria

This task is complete when:

```text
1. Airic exposes the tool set:
   read, ls, find, grep, edit, write, bash

2. The tools are Airic-owned implementations, not direct Pi Coding Agent runtime dependencies.

3. Pi implementation details have been selectively ported where useful:
   - edit-diff
   - file mutation queue
   - truncation
   - rg/fd search behavior
   - bash timeout/output handling

4. Pi TUI/resource/package/skill assumptions are not imported.

5. edit and write emit ACP diff content.

6. bash works in local dogfood mode.

7. ToolPolicy exists and is called, even if it currently allows all.
```

---

## Important Design Rule

Pi provides implementation experience.

Airic owns the product semantics.

Do not make Airic a Pi Coding Agent wrapper.
