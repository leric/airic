---
id: core.tool.write
doc_type: core.tool
tool: write
title: write Usage
---

# write

Use write to create a new file or replace an entire file's contents.

## When to use

- Creating a file that does not exist yet.
- Deliberate full rewrites when the user wants the whole file replaced.

## Patterns

- Prefer edit for incremental changes to existing files.
- read first when overwriting, so you understand what you are replacing.

## Avoid

- Using write for small patches to large existing files.
- Overwriting without user intent when edit would be safer.