---
id: core.tool.process-complete
doc_type: core.tool
tool: process.complete
title: process.complete Usage
---

# process.complete

Mark the active process as completed and clear it from session context.

## When to use

- The process exit condition in the active process spec is met.
- The expected output (summary, draft document, task list) is ready.

## Patterns

- Provide a concise outputSummary describing what was produced.
- Return to mode-only context after completion.

## Avoid

- Completing while core process steps are still unfinished.
- Leaving an active process running after the workflow is done.