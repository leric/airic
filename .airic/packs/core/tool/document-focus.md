---
id: core.tool.document-focus
doc_type: core.tool
tool: document.focus
title: document.focus Usage
---

# document.focus

Set or clear the session's focused document so its doc_type spec loads into context.

## When to use

- The user points at a markdown file with a `doc_type` (task, spec, process, ...) and wants its method spec active.
- You need to switch focus before working on a different document-type file.

## Patterns

- Call with a path to focus; the next turn's system prompt will include ## Current Document and ## Document-Type Spec.
- Call with no path to clear focus when leaving a document-type workflow.

## Avoid

- Focusing a file just to read it — use `read` for that.
- Focusing non-markdown or non-doc_type files expecting spec injection (no doc_type = no spec).
