# Airic Kernel Requirement: Stack-style Dig-in Session History

## 1. Problem

Airic Chat Agent should support deep thinking without forcing users into a flat linear conversation.

In real discussion, users often want to temporarily explore a detail. In a normal chat UI, this creates two problems:

1. If the user explores the detail in the same conversation, recent detail context may pollute the model’s later reasoning.
2. If the user opens a new conversation, they must restate the context, which is costly.

Airic Kernel should provide a lightweight session-history mechanism that allows users to temporarily dig into a detail, summarize it, and then continue from the previous thought boundary.

## 2. Design Goal

Provide a generic kernel-level capability for scoped conversation history.

The kernel should not encode high-level semantics such as:

* mainline
* branch
* abstraction level
* open loop
* decision
* task
* hypothesis

Those meanings belong to packs or users.

Kernel only provides:

* a tree of conversation turns
* a current cursor
* a dig stack
* a way to summarize a temporary digression
* a way to continue from the previous thought boundary without raw detail history polluting runtime context

## 3. User-facing ACP Commands

For ACP MVP, expose only two commands:

```text
/digin [optional topic]
/sumup
```

No `/goto`, `/fork`, `/label`, `/bookmark`, or custom title editing is needed for ACP MVP.

The full tree/goto model can exist internally, but ACP UI should expose a simpler stack-style workflow.

## 4. Core Interaction Model

The intended user flow:

```text
User: Let's continue designing Airic Kernel history.

Assistant: ...

User: /digin ACP UI limitation

Assistant: Digging into: ACP UI limitation.

User: ACP probably cannot visually switch history paths.

Assistant: ...

User: So the better ACP interface is probably command-based.

Assistant: ...

User: /sumup

Assistant:
Returned to: Airic Kernel history design

Before dig-in:
We were discussing how Airic Kernel should support scoped session history.

Dig-in summary:
ACP is not suitable for arbitrary visual tree navigation, but it can support a stack-style dig-in workflow using `/digin` and `/sumup`.

Brought back:
Use tree/goto/summary internally, but expose only `/digin` and `/sumup` in ACP.

Continuing from the previous thought boundary.
```

After `/sumup`, future runtime context should include the summary of the digression, not the raw digression turns.

## 5. Internal Model

Although ACP exposes only `/digin` and `/sumup`, the kernel should internally store turns as a tree.

Each normal conversation turn is a node.

A turn means:

```text
one user message + one assistant response
```

Tool calls are not first-class tree nodes.

## 6. Turn Node Data Model

Minimal model:

```ts
type TurnNode = {
  id: string
  parentId?: string

  userMessage: string
  assistantMessage: string

  title: string
  summary?: string

  toolTraceRef?: string

  createdAt: string
}
```

Rules:

* `id` is stable and internal.
* `parentId` defines the tree.
* `title` is auto-generated for debugging/tree display.
* Tool calls are stored in trace logs and referenced by `toolTraceRef`.
* Tool calls do not appear as tree nodes.

## 7. Session State

Minimal session state:

```ts
type SessionState = {
  id: string

  rootTurnId?: string
  currentTurnId?: string

  turns: Record<string, TurnNode>

  digStack: DigFrame[]

  backStack?: string[]
}
```

`backStack` is optional for MVP if arbitrary `/goto` is not exposed.

## 8. Dig Frame Model

```ts
type DigFrame = {
  baseTurnId: string
  topic?: string

  startTurnId?: string
  currentDigTurnId?: string

  startedAt: string
}
```

Meaning:

* `baseTurnId` is the turn where the user started `/digin`.
* `startTurnId` is the first normal turn inside the digression.
* `currentDigTurnId` tracks the current end of the digression path.
* The frame is popped when `/sumup` completes.

## 9. `/digin` Semantics

Command:

```text
/digin [optional topic]
```

Behavior:

1. Record the current cursor as `baseTurnId`.
2. Push a `DigFrame` onto `digStack`.
3. Do not create a new turn immediately unless needed for logging.
4. The next normal user message creates a child turn under `baseTurnId`.
5. Subsequent normal turns continue on that digression path.
6. Runtime context during digression may include:

   * path from root to `baseTurnId`
   * digression path from `startTurnId` to current dig turn
   * active mode/process/document context

The command expresses:

> I want to temporarily dig into this detail from here.

It does not mean the kernel understands the topic semantically.

## 10. `/sumup` Semantics

Command:

```text
/sumup
```

Behavior:

1. Read the top `DigFrame`.
2. Identify the digression path:

   ```text
   startTurnId -> ... -> currentDigTurnId
   ```
3. Generate a concise summary of the digression.
4. Generate a short “resume point” describing what was being discussed at `baseTurnId`.
5. Create a new return-summary turn as a child of `baseTurnId`.
6. Set `currentTurnId` to the return-summary turn.
7. Pop the `DigFrame`.
8. Return a response to the user that includes:

   * where we returned to
   * what the digression concluded
   * what should be brought back
   * what context will be used going forward

Important invariant:

After `/sumup`, the active runtime context should be:

```text
root -> ... -> baseTurn -> returnSummaryTurn
```

not:

```text
root -> ... -> baseTurn -> raw digression turns -> returnSummaryTurn
```

The raw digression history remains stored in the tree, but it is not included in future prompt context by default.

## 11. Return Summary Turn

The return-summary turn is a normal turn node from the kernel’s perspective.

Suggested assistant message structure:

```text
Returned to: <resume point>

Before dig-in:
<what we were discussing>

Dig-in summary:
<what the side discussion found>

Brought back:
<conclusions or constraints that should affect the resumed discussion>

Continuing:
<where the discussion should continue from>
```

The `userMessage` for this node can be `/sumup`.

The `assistantMessage` is the generated summary/return response.

## 12. Runtime Context Builder

The Context Builder must be cursor-aware.

For each normal user message, build context from:

```text
kernel instruction
+ active mode spec, if any
+ active process spec, if any
+ current document/file context, if any
+ active cursor path
```

The active cursor path means:

```text
root -> ... -> currentTurnId
```

Rules:

* Do not use flat chronological session history.
* Do not include sibling paths by default.
* After `/sumup`, do not include raw digression turns.
* Include the return-summary turn because it is now part of the resumed path.
* Tool results may be represented through assistant responses or trace summaries, but individual tool calls are not tree nodes.

This is the core anti-pollution mechanism.

## 13. Summary Semantics

There are two different summary concepts.

### 13.1 Digression Summary

Created by `/sumup`.

Scope:

```text
digression path only
```

Purpose:

* summarize what was learned in the temporary detail exploration
* create a return-summary turn
* carry only compressed conclusions back to the resumed path

This is user-visible.

### 13.2 Context Compaction Summary

Optional internal mechanism.

Scope:

```text
active cursor path only
```

Purpose:

* compress old turns when active path becomes too long
* preserve runtime context budget

This is not part of ACP MVP unless needed.

Important rule:

Do not summarize the whole tree as runtime context. Whole-session/tree summaries may be useful for export or review later, but not for default model context.

## 14. Tree and Goto as Internal Primitives

Kernel may internally support:

```ts
getTree(sessionId)
gotoTurn(sessionId, turnId)
summarizePath(sessionId, fromTurnId, toTurnId)
createReturnSummaryTurn(...)
```

But ACP MVP should not expose arbitrary `/goto`.

Reason:

ACP chat UI cannot naturally replace the visible transcript with a selected history path. Arbitrary tree navigation would create mismatch between visible chat history and actual runtime context.

Therefore ACP should expose only stack-style navigation:

```text
/digin
/sumup
```

This keeps the visible transcript linear while the runtime history remains tree-structured.

## 15. ACP UI Behavior

ACP MVP should treat `/digin` and `/sumup` as logical navigation commands.

The visible chat may remain linear.

After `/sumup`, the assistant should explicitly print the restored context boundary, so the user understands that future reasoning continues from the summarized return point.

Example:

```text
Returned to: Airic Kernel session-history design.
The digression has been summarized and excluded from active raw context.
Future discussion will continue from the returned path.
```

This avoids relying on ACP to visually switch histories.

## 16. Optional Debug Command

A debug-only `/tree` command may be useful during development.

It is not part of the main ACP UX.

If implemented, it can print the internal turn tree with generated titles:

```text
1  Airic Kernel history design
└─ 2  ACP interaction constraints
   ├─ 3  Raw digression about goto limitations
   └─ 4  Return summary: use digin/sumup façade ← current
```

This helps validate the internal model.

## 17. Non-goals for MVP

Do not implement:

* labels
* bookmarks
* custom title editing
* arbitrary user-facing `/goto`
* visual tree UI
* branch merge
* branch comparison
* semantic branch types
* abstraction-level tracking
* open-loop tracking
* decision promotion
* document graph integration
* cross-branch semantic search
* whole-session runtime summary
* tool-call-level tree nodes

## 18. Acceptance Criteria

MVP is complete when:

1. Session history is stored as a tree of turns.
2. Each turn has a stable ID and parent reference.
3. `/digin` records the current cursor as a dig base.
4. Normal messages after `/digin` are stored as a digression path.
5. `/sumup` summarizes the digression path.
6. `/sumup` creates a return-summary turn under the dig base.
7. After `/sumup`, the current cursor points to the return-summary turn.
8. Future runtime context follows the cursor path only.
9. Raw digression turns are not included in future prompt context by default.
10. The visible ACP chat can remain linear without breaking the logical context model.
11. Tool calls do not appear as tree nodes.
12. A debug `/tree` command can verify the internal tree structure, if implemented.

## 19. One-line Summary

Airic Kernel should store chat history as a turn tree, but expose a simple ACP interaction: `/digin` starts a temporary detail exploration, `/sumup` summarizes that exploration into a return node, and future model context continues from the returned path without raw side discussion polluting the main reasoning.
