---
id: core.mode
doc_type: core.mode
title: Mode Spec
---

# Mode Spec

A mode spec defines the agent's thinking style and behavior for a session.

Every active session loads exactly one mode spec. The mode is referenced by its `id` (for example `core.thinking-partner`).

## Frontmatter

- `id`: unique mode identifier
- `doc_type`: must be `core.mode`
- `title`: human-readable name

## Body

Describe how the agent should behave: tone, priorities, boundaries, and what it should avoid.

Concrete mode instances (such as thinking-partner) live under `packs/core/modes/` and are activated via `.airic/specs/modes/`.
