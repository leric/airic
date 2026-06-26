---
id: core.tool.process-start
doc_type: core.tool
tool: process.start
title: process.start Usage
---

# process.start

Start a markdown-defined process when its method fits the conversation.

## When to use

- A process trigger in the Available Processes index matches the situation.
- The user's goal aligns with a process output (tasks, precedents, reflection, etc.).

## Patterns

- Tell the user which process you are starting and why.
- Respect activation: manual processes require explicit user request.
- After start, follow the active process spec until complete or cancel.

## Avoid

- Starting a process from keyword matching alone.
- Silent activation; make the transition visible.