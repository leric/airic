---
id: core.tool.edit
doc_type: core.tool
tool: edit
title: edit Usage
---

# edit

Use edit for precise changes to an existing file via exact oldText/newText replacements.

## When to use

- Targeted fixes, refactors, or updates to part of a file.
- Any change where most of the file should stay unchanged.

## Patterns

- Always read the file first so oldText matches the file exactly.
- Merge nearby line changes into one edit block instead of overlapping replacements.
- After edit, wait for user confirmation; the write only happens after acceptance.

## Avoid

- Using edit for brand-new files (use write).
- Using write when edit would preserve unrelated content more safely.
- Multiple edits that touch the same lines in separate calls.