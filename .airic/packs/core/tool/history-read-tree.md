---
id: core.tool.history-read-tree
doc_type: core.tool
tool: history.read_tree
title: history.read_tree Usage
---

# history.read_tree

Read a compact outline of the session turn tree: handles, kinds, one-line summaries, labels, and cursor-path markers (`*`).

## When to use

Before `history.summarize` or `history.move_cursor` when boundaries are unclear. This is the reliable way to obtain node handles — read first, then choose.
