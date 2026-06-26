---
id: core.process.task-decomposition
doc_type: core.process
title: Task Decomposition
summary: Turn clarified intent into executable task documents.
triggers:
  - user wants to turn discussion into executable tasks
  - user asks what an agent should do next
  - a stable objective needs delegation
  - a decision or plan is ready to execute
outputs:
  - core.task
activation: suggested
---

# Task Decomposition

Task Decomposition turns clarified intent into one or more executable task documents.

Use this process only when the user's intent is stable enough to be delegated or executed.

Do not use this process to force vague exploration into tasks.

## Trigger

Start this process when:

- the user asks to turn a discussion into tasks
- a decision or objective is stable enough to execute
- the user wants to hand work to an agent
- a piece of work needs clear scope, constraints, and verification

Do not start this process when the user is still exploring what should be done.

## Input

The input may include:

- a user objective
- a discussion summary
- an existing document
- a decision-like statement
- relevant workspace files
- constraints or non-goals
- known risks or blockers

## Method

### 1. Identify the executable slice

Separate the part that can be executed from the part that still requires judgment.

If the “what” is still unclear, stop and clarify before producing tasks.

### 2. Name the objective

State what the task is trying to accomplish.

The objective should be understandable without reconstructing the whole conversation.

### 3. Define scope and non-goals

Make the boundary visible.

A good task should say not only what to do, but also what not to do.

### 4. Attach context

Identify the context the executing agent will need.

Prefer concrete file paths, documents, decisions, or references over vague background.

If context is missing, mark it as a blocker.

### 5. Identify constraints

Capture constraints that should shape execution.

These may include technical, product, business, time, safety, compatibility, or style constraints.

### 6. Define acceptance criteria

Make success checkable.

If full automatic verification is impossible, describe what should be reviewed by a human.

### 7. Define writeback expectations

Specify what the executing agent should write back after completion.

Writeback may include changed files, summaries, test results, blockers, open questions, or follow-up tasks.

### 8. Surface decision points

If the task contains unresolved judgment, do not hide it inside execution.

Mark the judgment as a blocker, escalation point, or candidate for a separate discussion.

## Output

The output should be one or more `core.task` documents or task drafts.

Each task should be executable enough that an agent can proceed without continuous human supervision.

## Exit Condition

This process is complete when each produced task has:

- clear objective
- clear scope
- visible non-goals
- relevant context
- constraints
- acceptance criteria
- verification or review method
- writeback expectations
- surfaced blockers or decision points

If these cannot be established, do not pretend the task is ready. Return to clarification.

## Failure Modes

Avoid:

- turning unresolved exploration into tasks
- creating tasks that require hidden human judgment
- over-decomposing into tiny mechanical steps
- producing tasks without acceptance criteria
- expanding scope while decomposing
- losing the original intent
