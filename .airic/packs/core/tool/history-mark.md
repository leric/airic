---
id: core.tool.history-mark
doc_type: core.tool
tool: history.mark
title: history.mark Usage
---

# history.mark

Add a named label to a node (default: cursor). Later reference it with `{label: "name"}` in other history tools.

## Best practice

Mark the main line before diving into a detail branch, so you can return with `history.move_cursor` and fold the branch with `history.summarize` without guessing boundaries.
