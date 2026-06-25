---
id: core.precedent-extraction
doc_type: core.process
title: Precedent Extraction
summary: Extract reusable human judgment from a concrete case.
triggers:
  - user makes a judgment that may apply again
  - repeated decision pattern appears
  - an agent correction reveals a reusable rule
  - review identifies a repeated failure mode
outputs:
  - core.precedent
activation: suggested
---

# Precedent Extraction

Precedent Extraction turns a concrete human judgment into a reusable precedent.

Use this process when a judgment made in one case may help future agents handle similar cases with less supervision.

A precedent is not a generic rule. It must remain anchored to the concrete case that produced it.

## Trigger

Start this process when:

- the user makes a judgment that may apply again
- a recurring decision pattern appears
- an agent needed human judgment for a case that is likely to recur
- a review reveals a repeated failure or correction
- the user explicitly asks to record a precedent

Do not start this process for every decision. Use it only when reuse seems likely.

## Input

The input should include:

- the concrete case
- the judgment made
- the reason for the judgment
- the surrounding context
- the tradeoff or ambiguity involved
- any relevant documents, tasks, events, or examples

If there is no concrete source case, do not extract a precedent yet.

## Method

### 1. Identify the source case

Describe the actual situation that produced the judgment.

Keep it concrete. Avoid abstracting too early.

### 2. State the judgment

Write what the user decided, preferred, rejected, corrected, or approved.

Separate the judgment from the reasoning.

### 3. Explain the rationale

Capture why the judgment was made.

Include the tradeoff, value, constraint, or risk that mattered.

### 4. Define the scope

State when this precedent should apply.

The scope should be narrower than the most tempting generalization.

### 5. Define the limits

State when this precedent should not apply.

If the next case differs materially, the agent should not blindly reuse the precedent.

### 6. Add counterexamples

When useful, include cases where the precedent would be misleading or wrong.

Counterexamples protect the precedent from overgeneralization.

### 7. Describe future use

Explain how a future agent should use this precedent.

A precedent should guide judgment, not override it.

### 8. Link back to the source

Preserve the connection to the source case, document, task, review, or conversation summary whenever possible.

## Output

The output should be a `core.precedent` document or a draft ready to become one.

## Exit Condition

This process is complete when the precedent has:

- a concrete source case
- the judgment
- rationale
- scope
- limits
- future-use guidance
- enough context to prevent overgeneralization

If scope or limits cannot be stated, mark the precedent as tentative.

## Failure Modes

Avoid:

- extracting generic advice without a source case
- turning one-off preference into broad policy
- hiding uncertainty
- making the precedent broader than the evidence supports
- using precedent to bypass human judgment in materially different cases
