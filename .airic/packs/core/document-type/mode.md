---
id: core.document-type.mode
doc_type: core.document-type
title: Mode
---

A mode is the way of thinking the user steps into for a stage of work. The document defines how the agent behaves throughout that stage—inducing and holding that mindset, and carrying the user through the tasks the stage exists to accomplish. It is not a job title, a narrow persona, a tool set, or a task-specific sub-agent, and it is not a self-portrait of the agent—it is the agent's durable behavior in service of the user's work in that stage.

### Purpose

Use a mode when the user enters a stage of work that calls for a particular way of thinking, and the agent needs stable footing to help them do that work. A good mode shapes:

- the way of thinking the user should be in, and how the agent keeps them there
- what the agent pays attention to
- what risks it watches for
- what kind of reasoning it applies
- what the agent actively drives, presses for, and holds back from as it moves the stage's tasks forward
- when to explore, when to challenge, when to help the user converge
- when to stay out of execution

### Required frontmatter (on each instance)

- `id`: unique identifier, e.g. `core.mode.thinking-partner`.
- `doc_type`: must be `core.mode`.
- `title`: human-readable name.

### How it loads

A session always has exactly one active mode, chosen by the configured default or switched by the user. Its full body sits in the system prompt as `## Active Mode` for the whole session, a stable session-level prefix paid once for the session; an active process may refine it but never replaces it. A mode is the single strongest influence on the agent's behavior, so make it as substantial as the stage genuinely needs. Keep a mode to broad session-level posture: step-by-step methods belong in processes, and domain document standards in document types.

### What an instance should contain

- the stage of work it serves, and the way of thinking the user should be in
- a high-level map of the stage: the main tasks it exists to accomplish, the processes and document types they draw on, and how these cooperate. This map doubles as a statement of the mode's purpose—naming the tasks a mode serves is what pins down what the mode actually is
- how the agent concretely behaves to drive those tasks—what it leads on, presses for, and holds back from
- the user's likely objective in this stage
- the main risks or failure modes
- the kinds of questions worth surfacing
- the kinds of outputs that may emerge
- the boundaries between thinking, judgment, and execution

### Good examples

Modes are shaped by a broad stance or stage of work, not an occupation:

- `core.thinking-partner` — open-ended thinking: follow the user's line of thought, preserve unresolved ideas, hold off on execution until intent is stable.
- `mvp-stage` — building toward a first usable version: bias to the shortest path to learning, treat polish as deferrable, watch for premature scope and over-engineering.
- `discovery` — exploring an unfamiliar problem: widen the option space before narrowing, surface assumptions and unknowns, resist locking in too early.

Each sets what to attend to and what to optimize across many tasks, without prescribing the steps of any one.

### What an instance should avoid

Do not define a mode around a narrow occupational role — developer, product manager, document editor, reviewer, workspace explorer. Those are usually tool behaviors, document standards, processes, or domain activities.

Do not turn a mode into a step-by-step workflow. If the behavior has a clear trigger, input, steps, output, and exit condition, it is a process.

### Editing guidance

- preserve its broad reasoning posture
- avoid narrowing it into a persona
- avoid turning it into a process
- avoid embedding domain document standards that belong in a document type
- keep its high-level map current as the stage's tasks, processes, and document types change
- keep it useful as session-level context
