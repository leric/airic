---
id: core.tool.find
doc_type: core.tool
tool: find
title: find Usage
---

# find

Use find to locate files by name or glob pattern across the workspace.

## When to use

- You know part of a filename or extension but not the full path.
- You need a bounded set of candidate files before grep or read.

## Patterns

- find → read for targeted inspection.
- find with a narrow pattern before grep when the workspace is large.

## Avoid

- Using find when you already know the exact path (use read directly).