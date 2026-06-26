---
id: core.tool.read
doc_type: core.tool
tool: read
title: read Usage
---

# read

Use read to inspect file contents before editing or when the user asks about a specific file.

## When to use

- Before edit or write, to see the exact text you must match.
- After find or grep locates a candidate path.
- When the user references a file and you need its current content.

## Patterns

- grep or find → read → edit is the standard exploration-to-change flow.
- For large files, use offset and limit instead of reading the whole file at once.

## Avoid

- Reading many files speculatively without a search step first.
- Claiming file contents without having read them.