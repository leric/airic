---
id: core.document-type.precedent
doc_type: core.document-type
title: Precedent
---

# Precedent

A precedent preserves reusable human judgment from a concrete case. It is not a generic rule; it is judgment extracted from an actual situation, carrying its context, rationale, scope, and limits. Precedents let future agents act with better judgment without re-asking the user to resolve the same kind of issue.

### Purpose

Use a precedent when a human judgment may apply beyond the case that produced it. A good precedent helps the agent understand:

- what happened
- what judgment was made
- why it was made
- when similar judgment should apply again
- when it should not

### What an instance should contain

A precedent should make clear:

- source case — the concrete situation it came from
- judgment — what was decided
- rationale — why
- relevant context, and related documents or events
- scope of applicability, and its limits
- counterexamples
- how a future agent should apply it, and when to surface the case back to the user instead

A precedent without a concrete source case is detached advice. Its boundary — when *not* to apply it — matters as much as the judgment itself, since that is what keeps a future agent from misapplying it silently.

### What an instance should avoid

- becoming an abstract slogan
- overgeneralizing from one case
- erasing the uncertainty, tradeoffs, or conditions that shaped the judgment
- overriding human judgment when the new situation is materially different

### Editing guidance

- preserve the concrete source case
- separate judgment from rationale
- make scope and limits explicit
- include counterexamples when useful
- keep the rule no broader than the evidence supports
- make clear how future agents should apply or question it
- let a precedent be revised or superseded when judgment changes — it is durable, not frozen
