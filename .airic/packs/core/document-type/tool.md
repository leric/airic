---
id: core.document-type.tool
doc_type: core.document-type
title: Tool
---

A tool document defines the usage methodology for one system tool. The callable contract — tool name, parameters, and hard constraints — lives in code; the tool document explains when to use the tool, how to combine it with others, and what to avoid. It is not the implementation, a cross-tool workflow, or a session posture.

### Purpose

Use a tool document when the agent needs stable guidance for wielding a kernel capability. A good one helps the agent understand:

- when the tool is appropriate
- how it fits into common exploration and editing workflows
- how it combines with other tools
- anti-patterns and failure modes

### Required frontmatter (on each instance)

- `id`: unique identifier, e.g. `core.tool.grep`.
- `doc_type`: must be `core.tool`.
- `tool`: must match a registered kernel tool name exactly (one-to-one).

### How it loads

Tool documents live in the system prompt as `## Tool Usage` for the whole session — a stable prefix paid once. Each kernel tool has exactly one tool document, and the binding is guarded so the set never drifts.

### What an instance should contain

- when to use the tool
- common patterns, often in combination with other tools
- what to avoid

### What an instance should avoid

- duplicating the one-line contract or JSON schema from code
- describing cross-tool workflow orchestration (that belongs in a mode or process)
- scenario-specific creative usage (a scenario pack layers that in process or mode prose)

If a method has a clear trigger, input, steps, output, and exit condition across multiple tools, it is a process — not a single tool document.

### Editing guidance

- keep methodology separate from the code contract
- preserve the one-to-one `tool:` binding
- prefer concrete patterns over generic advice
