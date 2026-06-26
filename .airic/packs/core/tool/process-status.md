---
id: core.tool.process-status
doc_type: core.tool
tool: process.status
title: process.status Usage
---

# process.status

Check whether a process is active and inspect its instance metadata.

## When to use

- You need to confirm an active process before complete or cancel.
- The user asks what workflow is running.

## Patterns

- Use before process.complete or process.cancel when unsure of state.

## Avoid

- Repeated status checks when the active process is already in context.