---
id: core.document-type.task
doc_type: core.document-type
title: Task
---

A task defines executable work for an agent. It is not a casual todo item; it is an executable contract. A good task carries enough clarified intent for an agent to act, verify progress, report blockers, and write results back without continuous human supervision.

### Purpose

Use a task when a piece of work is ready to be executed or delegated. A task should make clear what should be done, why it matters, what boundaries apply, and how success can be checked. If success cannot be stated, the work is not yet a task — it is still thinking.

### What an instance should contain

A good task lets an agent answer, without re-asking:

- **What** — objective, scope, non-goals, and expected output
- **Why** — the background and why the work matters
- **Boundaries** — constraints and the relevant context to work within
- **How it's checked** — acceptance criteria, verification method, and writeback expectations
- **Where to stop** — known risks or blockers, and the decisions the agent must escalate rather than make alone

These need not be rigid fields, but each should be answerable from the document.

### What an instance should avoid

- hiding unresolved intent behind execution detail
- turning vague exploration into a task before intent is stable
- burying product, business, architecture, research, or strategic judgment inside implementation instructions
- asking the agent to settle decisions that should be visible to the user, unless a clear precedent or policy applies

### Editing guidance

- strengthen intent before adding execution detail
- make scope and non-goals visible
- make verification explicit wherever possible
- identify missing context
- surface unresolved judgment as a blocker or decision request
- keep the task within its original purpose
