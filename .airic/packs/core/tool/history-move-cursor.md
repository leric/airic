---
id: core.tool.history-move-cursor
doc_type: core.tool
tool: history.move_cursor
title: history.move_cursor Usage
---

# history.move_cursor

Move the current cursor to another node in the session turn tree. Continuing the conversation from there naturally grows a new branch.

## When to use

- Return to the main line after exploring a side branch.
- Switch to an earlier candidate path and retry from there.

## Anchors

Use `target` with: `cursor`, `root`, `parent`, `nearest-fork`, `{recent: N}`, `{olderThan: N}`, `{label: "..."}`, or a node id handle from `history.read_tree`.
