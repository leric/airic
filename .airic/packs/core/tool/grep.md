---
id: core.tool.grep
doc_type: core.tool
tool: grep
title: grep Usage
---

# grep

Use grep to search for text across files in the workspace.

## When to use

- Locating where a symbol, string, or concept appears.
- Narrowing down which files to read before editing.

## Patterns

- grep → read → edit is the most common search-and-change workflow.
- Use path and glob to limit scope when you know the area of the codebase.

## Avoid

- Grepping the entire workspace with overly broad patterns when a path hint exists.