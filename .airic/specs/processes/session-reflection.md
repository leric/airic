---
id: core.session-reflection
doc_type: core.process
title: Session Reflection
summary: Compress a thinking session into durable continuation state.
triggers:
  - user asks to summarize the session
  - user is about to stop or switch context
  - discussion reached a meaningful boundary
  - session produced decisions, tasks, or open loops
outputs:
  - session summary
activation: suggested
---

# Session Reflection

Session Reflection compresses a thinking session into durable state.

Use this process at a natural boundary: when the user is stopping, switching context, preparing to hand off work, or asking what was concluded.

The purpose is not to summarize everything. The purpose is to preserve what will matter later.

## Trigger

Start this process when:

- the user asks to summarize the session
- the user is about to stop
- the discussion has reached a meaningful boundary
- the user wants to continue later
- the session produced decisions, tasks, precedents, or important open loops
- the agent needs to prepare a handoff or writeback

Do not interrupt active deep thinking just to reflect.

## Input

The input may include:

- the current conversation path
- return summaries from digressions
- current document content
- open loops
- decisions or decision candidates
- task candidates
- precedent candidates
- files read or edited during the session

## Method

### 1. Identify the main thread

Name what the session was mainly about.

Do not confuse side discussions with the main thread.

### 2. Capture stable conclusions

Record what became clearer or more settled.

Do not present unresolved exploration as settled conclusion.

### 3. Capture open loops

List unresolved items that may matter later.

Keep them lightweight. Do not force every open loop into a task.

### 4. Identify task candidates

If part of the discussion is executable, mark it as a task candidate.

Only produce task drafts if the user asks or the intent is sufficiently clear.

### 5. Identify precedent candidates

If reusable judgment emerged, mark it as a precedent candidate.

Do not extract a full precedent unless the case, judgment, rationale, and scope are clear enough.

### 6. Identify document updates

If workspace documents should be created or updated, name them.

Do not silently create project documents unless the user asks or approves.

### 7. Define the next return point

State where the user can resume next time.

The return point should be short and useful.

## Output

The output should be a compact reflection.

It may include:

- main thread
- stable conclusions
- open loops
- task candidates
- precedent candidates
- document updates
- suggested next entry point

If the user wants a persistent artifact, write or update an appropriate workspace document.

## Exit Condition

This process is complete when the user has a reliable continuation point and does not need to keep the session state in their head.

## Failure Modes

Avoid:

- summarizing every detail
- inflating tentative thoughts into decisions
- creating too many tasks
- losing the distinction between main thread and side thread
- producing a reflection that is too long to be useful
- hiding unresolved questions
