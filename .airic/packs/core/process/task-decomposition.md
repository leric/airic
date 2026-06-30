---
id: core.process.task-decomposition
doc_type: core.process
title: Task Decomposition
summary: Turn clarified intent into executable task documents.
triggers:
  - user wants to turn discussion into executable tasks
  - a stable objective or decision is ready to delegate or execute
  - user asks what an agent should do next
outputs:
  - core.task
activation: suggested
---

# Task Decomposition

Task Decomposition turns clarified intent into one or more executable `core.task` documents. Run it only when the user's intent is stable enough to delegate or execute; while the user is still exploring what should be done, stay in the conversation instead.

### When to start

Start when a stable objective or decision needs clear scope, constraints, and verification so an agent can act on it — typically when the user asks to turn a discussion into tasks or to hand work off.

Preconditions: the "what" is clear enough to name, and the user is past deciding whether to do it. If the "what" is still forming, clarify first.

### Input

Any of: a user objective, a discussion or decision summary, an existing document, relevant workspace files, and known constraints, non-goals, risks, or blockers.

### Method

1. **Separate the executable slice.** Split what can be executed now from what still needs human judgment. If the "what" is unclear, stop and clarify before producing tasks.
2. **State the objective and why it matters.** Make each task understandable without reconstructing the whole conversation — the goal, and the reason it matters.
3. **Define scope and non-goals.** Make the boundary visible: what to do, and what to leave out.
4. **Attach context.** Identify what the executing agent will need, preferring concrete file paths, documents, and decisions over vague background. Mark missing context as a blocker.
5. **Capture constraints.** Technical, product, business, time, safety, compatibility, or style constraints that should shape execution.
6. **Define acceptance criteria.** Make success checkable. Where automatic verification is impossible, say what a human should review.
7. **Define writeback expectations.** What the executing agent should report back: changed files, summaries, test results, blockers, open questions, or follow-up tasks.
8. **Surface decision points.** Keep unresolved judgment out of execution detail — mark it as a blocker, an escalation point, or a separate discussion. If the same judgment recurs across tasks, it is a precedent candidate rather than a repeated escalation.

### Output

One or more `core.task` documents or drafts, each executable enough that an agent can proceed without continuous supervision.

### Exit condition

Complete when each produced task meets the `core.task` standard — objective, scope and non-goals, relevant context, constraints, acceptance and verification method, writeback expectations, and surfaced blockers or decision points. If these cannot be established, the task is not ready; return to clarification.

### Failure modes

- forcing unresolved exploration into tasks
- creating tasks that depend on hidden human judgment
- over-decomposing into tiny mechanical steps
- producing tasks without acceptance criteria
- expanding scope while decomposing
- losing the original intent
