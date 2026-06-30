---
id: core.process.session-reflection
doc_type: core.process
title: Session Reflection
summary: Reflect on the agent's own thinking and actions during a session to learn and improve.
triggers:
  - a session reaches a meaningful boundary
  - the user asks to review how the work went
  - the agent hit notable friction, a correction, or a stretch worth learning from
  - before stopping or switching context, while the trace is fresh
outputs:
  - improvement proposals
  - core.precedent
activation: suggested
---

# Session Reflection

Session Reflection turns a finished stretch of work into learning. The agent observes its own thinking and actions during the session, names what worked and what went wrong, attributes each to a cause, and proposes the smallest useful improvement — so the next session goes better. It reads the session's trace while the evidence is still fresh, much as a post-task design reflection reads the trace a code change leaves behind.

### When to start

Run it at a natural boundary, while the trajectory is still fresh — after a meaningful stretch of work, a correction, notable friction, or a surprisingly smooth run worth learning from, and before the user stops or switches context. Reflect at the seam, not mid-thread; do not interrupt active deep thinking.

### Input

The session's actual trajectory: the conversation path from root to the current cursor, where the user corrected or redirected the agent, which mode or process was active, which documents and context the agent used or struggled to find, and where it over-structured, under-structured, or misread intent. Sibling branches the agent explored but moved away from are not in context.

### Method

1. **Reconstruct the actual process.** Describe what the agent did, not what it should have done — where it looked, what it tried, where it was corrected, where things flowed. The conversation path is in context; tool-call details from earlier turns are not, so re-read workspace files only when needed to recover what actually happened. Do not go looking for session logs, transcript files, or `.airic/logs/` to reconstruct history — the conversation is already in context. This is observation, recall, and reflection, not new work or open-ended retrieval.
2. **Mark what worked.** Name the moves that helped the user think and the calls that landed well. Reflection is not only fault-finding; good moves are worth reinforcing.
3. **Mark the friction.** Name derailments, over-structuring, premature execution, missed intent, wasted turns, or context pollution.
4. **Attribute each to a cause.** For every win and friction, ask why. Distinguish a methodology gap (a mode, process, or document type that was unclear or missing), a workspace or context gap (information hard to find, a missing precedent), agent behavior (available signals ignored, shortcuts taken), and genuine ambiguity. The attribution matters more than the symptom.
5. **Propose the smallest useful improvement.** Tie each repair to its cause and place it at the right layer — refine a methodology document, extract a precedent, adjust workspace structure, or surface a gap to the user. Prefer the smallest change that prevents a recurrence over a broad rewrite.
6. **Surface; do not silently apply.** Changes to methodology, the pack, or the workspace are proposals for the user to decide. The agent does not quietly rewrite what it is or how the workspace is organized.

### Output

A compact reflection: what worked, what created friction with its attributed cause, and concrete improvement proposals at the right layer — plus any precedent candidates that emerged. Not every session needs changes; "this went well, nothing to repair" is a valid result.

### Exit condition

Complete when the notable wins and frictions are attributed, and each actionable one has a proposed improvement at the right layer or is consciously set aside. The user is left with clear, optional next steps rather than a backlog of vague intentions.

### Failure modes

- listing problems while ignoring what worked
- naming a symptom without attributing a cause
- vague suggestions like "be more careful" that cannot be acted on
- silently editing methodology, pack, or workspace instead of proposing
- over-reflecting on a smooth session, or turning reflection into blame
- proposing a broad rewrite when a small repair at the right layer would do
