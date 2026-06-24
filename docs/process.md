# Airic Kernel Requirement: Markdown-defined Process Lifecycle

## 1. Purpose

Airic Core Pack defines `core.process` documents as markdown-defined, skill-like workflows.

A process is not just prose loaded into the prompt. It is a first-class kernel concept with lifecycle support:

```text
discover -> suggest/start -> run -> complete/cancel
```

The process content remains markdown-defined. The kernel does not hard-code process behavior. However, the kernel must support process discovery, activation, session state, context loading, commands, and agent-facing tools.

## 2. Problem

Airic process documents currently describe methods such as:

```text
core.task-decomposition
core.precedent-extraction
core.session-reflection
core.document-review
```

These processes are meant to be usable during conversation, but without kernel support they become passive documents. The agent may read them, but it cannot reliably:

* know which processes exist
* identify candidate processes cheaply
* start a process
* track that a process is active
* load the full process spec only when needed
* complete or cancel a process
* expose process state to the user

Airic needs a lightweight process lifecycle system.

## 3. Core Concept

A process is a markdown-defined workflow with:

* machine-readable frontmatter metadata
* prose body defining the actual method
* session-scoped lifecycle state
* optional user command activation
* optional agent tool activation

A process is similar to a skill, but with Airic semantics:

```text
Skill-like:
  reusable method
  trigger-aware
  activated when relevant
  has expected output

Airic-specific:
  markdown-defined
  session-scoped
  loaded through .airic specs
  layered on top of active mode
  tracked by kernel
  produces or updates workspace documents when appropriate
```

## 4. Design Boundary

### Process spec owns methodology

The process markdown document defines:

* when the process is useful
* what input it expects
* what steps it follows
* what output it produces
* when it should end
* what failure modes to avoid

### Kernel owns lifecycle

The Airic Kernel manages:

* process discovery
* process registry
* process metadata index
* active process state
* process start/complete/cancel commands
* process tools available to the agent
* context builder behavior
* session persistence

### Agent owns judgment

The agent decides, guided by process metadata and active mode, whether a process appears useful.

The agent may suggest or start a process only within the activation policy defined by the process.

The agent follows the full process spec while the process is active.

## 5. Process Frontmatter

Each process spec must have minimal machine-readable metadata.

Example:

```markdown
---
id: core.task-decomposition
doc_type: core.process
title: Task Decomposition
summary: Turn clarified intent into executable task documents.
triggers:
  - user wants to turn discussion into executable tasks
  - user asks what an agent should do next
  - a stable objective needs delegation
  - a decision or plan is ready to execute
outputs:
  - core.task
activation: suggested
---

# Task Decomposition

...
```

## 6. Required Frontmatter Fields

```yaml
id: core.task-decomposition
doc_type: core.process
title: Task Decomposition
summary: Turn clarified intent into executable task documents.
triggers:
  - ...
activation: suggested
```

### Field meanings

```text
id
  Stable process identifier.

doc_type
  Must be core.process.

title
  Human-readable name.

summary
  One-sentence description for process registry and prompt index.

triggers
  Semantic hints describing when the process may be useful.

activation
  Defines who may start the process and how visible activation should be.
```

## 7. Optional Frontmatter Fields

```yaml
outputs:
  - core.task

requires:
  - stable intent
  - relevant context

ends_when:
  - task draft is produced
  - user cancels
```

These fields are optional. The process body remains the authoritative method description.

Do not turn process frontmatter into a full DSL.

## 8. Activation Policy

Support two activation modes in MVP:

```yaml
activation: manual
```

Only the user may start this process explicitly.

```yaml
activation: suggested
```

The agent may suggest or start this process when its trigger metadata matches the conversation state, but activation must remain visible to the user.

Do not support silent `automatic` activation in MVP.

If future versions support `automatic`, it should be treated as a separate design with stronger guardrails.

## 9. Process Registry

Kernel should scan process specs from configured spec paths:

```text
.airic/specs/processes/*.md
.airic/packs/*/processes/*.md
```

MVP may only load active specs under:

```text
.airic/specs/processes/
```

The registry stores lightweight metadata:

```ts
type ProcessSpecIndex = {
  id: string
  title: string
  summary: string
  triggers: string[]
  outputs?: string[]
  activation: 'manual' | 'suggested'
  path: string
}
```

The registry should not load all full process bodies into every prompt.

## 10. Runtime Context Behavior

For normal conversation, context builder should include only a compact process index, not full process specs.

Example injected process index:

```text
Available processes:
- core.task-decomposition: Turn clarified intent into executable task documents.
  Triggers: user wants tasks; stable objective needs delegation.
  Activation: suggested.

- core.precedent-extraction: Extract reusable human judgment from a concrete case.
  Triggers: reusable judgment; repeated decision pattern; review correction.
  Activation: suggested.
```

When a process is active, context builder should include the full active process spec:

```text
base instruction
+ active mode spec
+ active process spec, if any
+ current document/doc_type spec, if any
+ cursor path history
+ relevant tool-loaded context
```

Process does not replace mode. It is layered on top of mode.

## 11. Session State

Add process instance state to session.

Suggested model:

```ts
type ProcessInstance = {
  id: string
  processId: string
  status: 'active' | 'completed' | 'cancelled'
  startedBy: 'user' | 'agent'
  startedAt: string
  completedAt?: string
  cancelledAt?: string
  reason?: string
  inputSummary?: string
  outputSummary?: string
  state?: Record<string, unknown>
}

type SessionState = {
  id: string
  modeId?: string
  currentDocument?: string
  activeProcessInstanceId?: string
  processInstances: Record<string, ProcessInstance>
}
```

MVP may support only one active process at a time.

Nested processes are a non-goal for MVP.

## 12. User Commands

Add process commands.

Required MVP commands:

```text
/process list
/process start <process-id>
/process status
/process complete
/process cancel
```

Optional shorthand:

```text
/process <process-id>
```

Equivalent to:

```text
/process start <process-id>
```

### `/process list`

Shows available process metadata:

```text
core.task-decomposition
  Turn clarified intent into executable task documents.
  Activation: suggested.

core.precedent-extraction
  Extract reusable human judgment from a concrete case.
  Activation: suggested.
```

### `/process start <process-id>`

Starts a process explicitly by user request.

Behavior:

1. Validate process exists.
2. Load full process spec.
3. Create `ProcessInstance`.
4. Set it as active process.
5. Confirm activation to user.
6. Continue under active process context.

### `/process status`

Shows active process, if any:

```text
Active process: core.task-decomposition
Started by: user
Reason: User requested task breakdown.
```

If no process is active, say so.

### `/process complete`

Completes active process.

Behavior:

1. Mark current process instance completed.
2. Store output summary.
3. Clear active process.
4. Confirm completion.

### `/process cancel`

Cancels active process.

Behavior:

1. Mark current process instance cancelled.
2. Store cancellation reason if available.
3. Clear active process.
4. Return to mode-only context.

## 13. Agent-facing Tools

Expose process lifecycle tools to the agent.

MVP tools:

```text
process.start
process.complete
process.cancel
process.status
```

Optional:

```text
process.list
```

If the process index is already injected into context, `process.list` is less important, but it is still useful for debugging and tool-based workflows.

## 14. Tool Contracts

### `process.start`

Input:

```ts
{
  processId: string
  reason: string
  inputSummary?: string
}
```

Behavior:

1. Validate process exists.
2. Validate activation policy.
3. If `activation: manual` and started by agent, reject or request user confirmation.
4. Create active process instance.
5. Load full process spec into subsequent runtime context.
6. Return process instance ID.

Output:

```ts
{
  processInstanceId: string
  processId: string
  title: string
  status: 'active'
}
```

### `process.complete`

Input:

```ts
{
  processInstanceId?: string
  outputSummary: string
}
```

Behavior:

1. Complete active process if instance ID is omitted.
2. Mark status as completed.
3. Store output summary.
4. Clear active process.

### `process.cancel`

Input:

```ts
{
  processInstanceId?: string
  reason: string
}
```

Behavior:

1. Cancel active process if instance ID is omitted.
2. Mark status as cancelled.
3. Store reason.
4. Clear active process.

### `process.status`

Input:

```ts
{}
```

Output:

```ts
{
  active: boolean
  activeProcess?: {
    processInstanceId: string
    processId: string
    title: string
    startedBy: 'user' | 'agent'
    startedAt: string
    reason?: string
    inputSummary?: string
  }
}
```

## 15. Agent Behavior Requirements

The agent should use process metadata as lightweight trigger guidance.

When a process appears useful, the agent may:

1. suggest the process to the user, or
2. call `process.start` if activation policy allows it and the transition is obvious.

For MVP, all agent-started processes should be visible in the response.

Example:

```text
I’ll use core.task-decomposition here because the goal is stable enough to turn into executable work.
```

Do not silently enter a process.

Do not start a process merely because a keyword matches.

Do not force active thinking into a process while the user is still exploring.

When the active process reaches its exit condition, the agent should call `process.complete`.

If the process no longer fits, the agent should call `process.cancel` or explain that the workflow should return to normal thinking.

## 16. Context Builder Rules

### Without active process

Include:

```text
base instruction
+ active mode spec
+ process index
+ current document/doc_type context, if any
+ cursor path history
```

### With active process

Include:

```text
base instruction
+ active mode spec
+ full active process spec
+ current document/doc_type context, if any
+ cursor path history
```

The process index may still be included while a process is active, but should be minimized to avoid context bloat.

Do not include all process bodies by default.

## 17. Relationship to Mode

Mode is the broad session posture.

Process is a temporary method.

```text
mode:
  broad reasoning posture
  usually active across a session
  example: core.thinking-partner

process:
  concrete workflow
  starts and ends
  has expected output
  example: core.task-decomposition
```

A process should never replace the active mode. It should refine behavior while active.

## 18. Relationship to Document Type

A process may produce or update documents.

For example:

```text
core.task-decomposition -> core.task
core.precedent-extraction -> core.precedent
core.document-review -> review findings or document edits
core.session-reflection -> session summary / continuation state
```

The process defines method.

The document type defines output quality standard.

Do not mix them.

## 19. MVP Non-goals

Do not implement in MVP:

* automatic trigger classifier
* embedding-based process retrieval
* nested processes
* multiple simultaneous active processes
* process marketplace
* process version migration
* process permissions beyond activation policy
* silent automatic activation
* full workflow engine
* structured process state machine DSL
* process execution independent of chat session

## 20. MVP Acceptance Criteria

The feature is complete when:

1. Kernel can scan process specs and build a process registry.
2. Process frontmatter supports `id`, `doc_type`, `title`, `summary`, `triggers`, and `activation`.
3. Context builder includes compact process index during normal chat.
4. User can run `/process list`.
5. User can run `/process start <process-id>`.
6. Starting a process creates a session-scoped process instance.
7. Active process full spec is loaded into runtime context.
8. User can run `/process status`.
9. User can run `/process complete`.
10. User can run `/process cancel`.
11. Agent can call `process.start`.
12. Agent can call `process.complete`.
13. Agent can call `process.cancel`.
14. Manual-only processes cannot be silently started by agent.
15. Suggested processes may be agent-started, but activation is visible.
16. Only one active process is allowed at a time in MVP.
17. Completing or cancelling a process clears active process context.
18. Process state persists in session state.
19. Existing mode behavior continues to work while process is active.
20. No full process bodies are injected into context unless the process is active.

## 21. Example Process Spec

```markdown
---
id: core.precedent-extraction
doc_type: core.process
title: Precedent Extraction
summary: Extract reusable human judgment from a concrete case.
triggers:
  - user makes a judgment that may apply again
  - repeated decision pattern appears
  - an agent correction reveals a reusable rule
  - review identifies a repeated failure mode
outputs:
  - core.precedent
activation: suggested
---

# Precedent Extraction

Precedent Extraction turns a concrete human judgment into a reusable precedent.

Use this process when a judgment made in one case may help future agents handle similar cases with less supervision.

## Input

The input should include the concrete case, the judgment made, the reason for the judgment, and the surrounding context.

## Method

1. Identify the source case.
2. State the judgment.
3. Explain the rationale.
4. Define the scope.
5. Define the limits.
6. Add counterexamples when useful.
7. Describe future use.
8. Link back to the source.

## Output

The output should be a `core.precedent` document or a draft ready to become one.

## Exit Condition

The process is complete when the precedent has a concrete source case, judgment, rationale, scope, limits, and future-use guidance.
```

## 22. One-line Summary

Airic Kernel should treat `core.process` specs as markdown-defined, skill-like workflows: discover them from frontmatter, expose them through commands and tools, track active process state in the session, load the full process spec only while active, and let the agent complete or cancel the process when its exit condition is reached.
