---
id: core.role
doc_type: core.role
title: Role Spec
---

# Role Spec

A role spec defines the agent's behavior mode and thinking style for a session.

Every active session loads exactly one role spec. The role is referenced by its `id` (for example `core.thinking-partner`).

## Frontmatter

- `id`: unique role identifier
- `doc_type`: must be `core.role`
- `title`: human-readable name

## Body

Describe how the agent should behave: tone, priorities, boundaries, and what it should avoid.

Concrete role instances (such as thinking-partner) live under `packs/core/roles/` and are activated via `.airic/specs/roles/`.
