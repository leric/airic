---
id: core.tool
doc_type: core.document-type
title: Tool
---

# Tool

A tool document defines the usage methodology for one system tool.

The callable contract — tool name, parameters, and hard constraints — lives in code. The tool document explains when to use the tool, how to combine it with others, and what to avoid.

A tool document is not the implementation, not a cross-tool workflow, and not a session posture.

## Purpose

Use a tool document when the agent needs stable guidance for wielding a kernel capability.

A good tool document helps the agent understand:

- when the tool is appropriate
- how it fits into common exploration and editing workflows
- how it combines with other tools
- anti-patterns and failure modes

## What a Tool Document Should Contain

A tool usage instance (`doc_type: core.tool`) should define:

- when to use the tool
- common patterns, often in combination with other tools
- what to avoid

Required frontmatter on instances:

- `id`: unique identifier (for example `core.tool.grep`)
- `doc_type`: must be `core.tool`
- `tool`: must match the registered kernel tool name exactly (one-to-one)

## What a Tool Document Should Avoid

A tool document should not:

- duplicate the one-line contract or JSON schema from code
- describe cross-tool workflow orchestration (that belongs in a mode or process)
- replace scenario-specific creative usage (scenario packs layer that in process or mode prose)

If a method has a clear trigger, input, steps, output, and exit condition across multiple tools, it is probably a process — not a single tool document.

## Editing Guidance

When editing a tool document:

- keep methodology separate from the code contract
- preserve the one-to-one `tool:` binding
- update the matching file under `packs/core/tools/` when changing default usage prose for new workspaces
- prefer concrete patterns over generic advice

Concrete tool usage instances live under `packs/core/tools/` and are loaded directly into the runtime spec registry.
