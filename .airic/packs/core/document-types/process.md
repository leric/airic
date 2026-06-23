---
id: core.process
doc_type: core.process
title: Process Spec
---

# Process Spec

A process spec describes a repeatable interaction flow with recognizable steps.

Processes can guide structured collaboration such as precedent extraction, discovery, or review.

## Frontmatter

- `id`: unique process identifier (for example `core.precedent-extraction`)
- `doc_type`: must be `core.process`
- `title`: human-readable name

## Body

Describe the steps, guidance, and stopping conditions for the process.

Concrete process instances live under `packs/core/processes/` and are activated via `.airic/specs/processes/`.
