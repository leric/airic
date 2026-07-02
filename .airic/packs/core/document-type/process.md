---
id: core.document-type.process
doc_type: core.document-type
title: Process
---

A process defines a concrete, repeatable method, appropriate when the work has a recognizable trigger, input, steps, output, and exit condition. It is not a broad thinking posture.

### Purpose

Use a process when the agent should follow a specific method rather than only a general posture. A good process tells the agent when to start, what input is needed, what steps to follow, what to produce, when to stop, and how to handle ambiguity or blockers.

### Required frontmatter (on each instance)

- `id`: unique identifier, e.g. `core.process.session-reflection`.
- `doc_type`: must be `core.process`.
- `title`: human-readable name.
- `summary`: one line describing what the process does.
- `triggers`: signals or situations when this process is worth starting.
- `activation`: `manual` (only the user starts it) or `suggested` (the agent may start it, but activation is always visible).
- `outputs` (optional): the document types or artifacts the process produces, e.g. `core.task` or `core.precedent`.

### How it loads

Loading is two-tier, to keep ordinary conversation cheap:

- **Inactive** → only the frontmatter index (`id` / `summary` / `triggers` / `activation`) is resident, under `## Available Processes`. Keep these fields tight; they are always loaded.
- **Active** → the full body is injected as `## Active Process`, and the index entry disappears.

At most one process is active at a time. The kernel manages the lifecycle (start / complete / cancel); a process refines the active mode, never replaces it.

### What an instance's body should contain

- trigger and preconditions
- input
- steps
- output
- exit condition
- failure or blocker handling
- how the result is written back or handed off

The body should be concrete enough that another agent can follow it consistently.

### What an instance should avoid

Do not write a process for a vague posture — deep focus, general discussion, being helpful, thinking carefully. Those belong in a mode or the base instruction.

Do not let a process take over user judgment. Where a step needs human judgment, surface that boundary rather than hide it.

### Editing guidance

- make triggers and outputs explicit
- remove vague steps that cannot be followed
- keep the process narrow enough to execute
- separate judgment points from execution steps
- avoid turning the process into a generic essay
