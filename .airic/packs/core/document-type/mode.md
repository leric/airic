---
id: core.document-type.mode
doc_type: core.document-type
title: Mode
---

# Mode

A mode defines a broad reasoning and collaboration posture for a session.

A mode is not a job title, a narrow persona, a tool set, or a task-specific sub-agent.

A mode tells the agent how to think with the user in a broad context.

## Purpose

Use a mode when the agent needs a stable perspective for interpreting the user's work.

A good mode should shape:

- what the agent pays attention to
- what risks it watches for
- what kind of reasoning it applies
- when it should explore
- when it should challenge
- when it should help the user converge
- when it should avoid execution

## What a Mode Should Contain

A mode document should define:

- the broad context or stage it serves
- the default collaboration posture
- the user's likely objective in this mode
- the main risks or failure modes
- the kinds of questions worth surfacing
- the kinds of outputs that may emerge
- boundaries between thinking, judgment, and execution

## What a Mode Should Avoid

A mode should not be defined around a narrow occupational role.

Avoid modes such as:

- developer
- product manager
- document editor
- reviewer
- workspace explorer

Those are usually tool behaviors, document standards, processes, or domain activities.

A mode should also avoid becoming a step-by-step workflow. If the behavior has a clear trigger, input, steps, output, and exit condition, it is probably a process.

## Editing Guidance

When editing a mode document:

- preserve its broad reasoning posture
- avoid narrowing it into a persona
- avoid turning it into a process
- avoid embedding domain-specific document standards that belong in document types
- keep it useful as session-level context
