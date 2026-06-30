---
id: core.process.precedent-extraction
doc_type: core.process
title: Precedent Extraction
summary: Extract reusable human judgment from a concrete case.
triggers:
  - user makes a judgment that may apply again
  - a recurring decision pattern appears
  - an agent correction reveals a reusable rule
  - review identifies a repeated failure mode
outputs:
  - core.precedent
activation: suggested
---

# Precedent Extraction

Precedent Extraction turns a concrete human judgment into a reusable `core.precedent`. Run it when a judgment made in one case is likely to help future agents handle similar cases with less supervision. A precedent stays anchored to the concrete case that produced it.

### When to start

Start when reuse seems likely — a judgment, a recurring decision pattern, an agent correction, or a review finding looks like it will recur, or the user asks to record a precedent.

Preconditions: there is a concrete source case. Without one, do not extract yet. Reserve this for judgments worth reusing rather than running it for every decision.

### Input

The concrete case and the judgment made, its reason, the surrounding context, the tradeoff or ambiguity involved, and any related documents, tasks, events, or examples.

### Method

1. **Identify the source case.** Describe the actual situation that produced the judgment. Keep it concrete; resist abstracting early.
2. **State the judgment.** What the user decided, preferred, rejected, corrected, or approved — separate from the reasoning.
3. **Explain the rationale.** Why the judgment was made: the tradeoff, value, constraint, or risk that mattered.
4. **Define the scope.** When this precedent should apply — narrower than the most tempting generalization.
5. **Define the limits.** When it should not apply. If the next case differs materially, the agent should not reuse it blindly.
6. **Add counterexamples.** Where useful, cases in which the precedent would mislead — these guard against overgeneralization.
7. **Describe future use.** How a future agent should apply it, and when to surface the case back to the user instead. A precedent guides judgment; it does not override it.
8. **Link back to the source.** Preserve the connection to the originating case, document, task, review, or conversation.

### Output

A `core.precedent` document or a draft ready to become one.

### Exit condition

Complete when the precedent meets the `core.precedent` standard — concrete source case, judgment, rationale, scope, limits, and future-use guidance, with enough context to prevent overgeneralization. If scope or limits cannot be stated, mark the precedent tentative.

### Failure modes

- extracting generic advice without a source case
- turning a one-off preference into broad policy
- hiding uncertainty
- making the precedent broader than the evidence supports
- using a precedent to bypass human judgment in materially different cases