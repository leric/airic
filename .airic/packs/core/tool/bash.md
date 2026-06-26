---
id: core.tool.bash
doc_type: core.tool
tool: bash
title: bash Usage
---

# bash

Use bash to run shell commands in the workspace (build, test, git, package managers).

## When to use

- Verifying behavior with tests or builds.
- Git or CLI operations the user explicitly requests.
- Commands whose output informs the next reasoning step.

## Patterns

- read/grep for file content; bash for runtime verification.
- Prefer non-destructive commands unless the user asked for the action.

## Avoid

- Using bash to read or search file contents (use read, grep, find).
- Destructive commands without clear user intent.