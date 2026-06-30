---
id: core.tool.history-summarize
doc_type: core.tool
tool: history.summarize
title: history.summarize Usage
---

# history.summarize

Distill a history range into a summary node. Use it to fold a side branch back into the main line, or compress older context on the current path.

## When to use

- **Side-branch fold**: omit `source` to summarize from the nearest fork to cursor; set `moveCursor: true` to bring the conclusion back.
- **Path compression**: set `source.from` / `source.to` on the current cursor path to replace that range in projection.

## Rules

- Always provide `prompt` (how to summarize).
- Never guess node ids — use anchors or read the tree first.
- Original nodes are preserved; use `history.read_node` to recover details.
