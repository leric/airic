---
name: cmp-post-task-reflection
description: Use this after completing a coding task to inspect the agent's context-routing trace, detect missing paths, unauthorized shortcuts, and unowned capabilities, and propose only safe locality or boundary repairs while escalating ownership and placement decisions to humans.
---

# CMP Post-Task Reflection Skill

Use after completing a coding task that modified an existing codebase. The goal is not to summarize the implementation, but to inspect the **context-routing trace**: how the agent found relevant files, followed or missed routing signals, chose a patch location, respected or bypassed boundaries, and whether the new capability had a clear owner.

A codebase's health is measured by how easily the **next** change can be made. Every completed task leaves a context-routing trace, and that trace is design feedback. Everything in this skill serves one goal: **lower the context cost of future modifications.** Keep the right context easy to find, keep design boundaries intact, and keep capabilities owned — so the next human or agent can modify the system reliably. The three checks below are just concrete ways to spot where the last change made the next change harder.

Reflection may repair routing and guard existing boundaries. It must not invent design authority. See `references/principles.md`.

## Glossary

Understanding these terms is a baseline requirement for running this skill:
- **Context-routing trace** — the actual path the agent took to find context and choose a patch location: searches, files opened, signals followed (names, tests, imports, errors, types, conventions), and the final placement decision.
- **Locality** — how easily the context needed for a change (files, tests, helpers, sibling edits) can be found near the point of change.
- **Modification closure** — the full set of places that must change together to keep the system consistent for one logical change.
- **Boundary** — an intended design seam (service, adapter, policy, repository, API, validator, contract, layer) that changes are meant to route through.
- **Owned capability** — a helper, conversion, policy, formatter, adapter, rule, or integration point that has a clear, designated home in the architecture.
- **What vs how** — *what* = behavior, contracts, boundaries, ownership, design intent (human-owned); *how* = implementation details inside those constraints (agent may handle).

## When to Use

Use when the task involved any of:
- Modifying existing behavior, or adding a feature to an existing flow.
- Fixing a bug that required codebase investigation.
- Refactoring; or updating tests, schemas, APIs, configs, docs, or generated artifacts.
- Touching multiple files that had to stay consistent.
- Creating or modifying a helper, abstraction, integration point, policy, adapter, or shared capability.
- Discovering that placement or ownership was unclear.

Do not use for trivial formatting-only edits, typo fixes, generated-only changes, or isolated dependency bumps.

## Workflow

1. **Reconstruct the task route** — entry point, files inspected, helpful signals (names, tests, types, docs, imports, errors, conventions), misleading/missing signals, final patch location, verification used.
2. **Run the three checks** — Missing Path, Unauthorized Shortcut, Unowned Capability. For each: found / not found, evidence, future risk, and whether the response is how-level or what-level. Details and allowed responses: `references/checks.md`.
3. **Analyze ownership & placement** if a capability was created, modified, or discovered. If ownership is unclear, escalate — do not resolve silently.
4. **Decide the response** — propose the smallest safe repair when the fix is how-level; escalate to a human when it is what-level (a new concept, owner, boundary, or placement rule). When unsure, escalate.
5. **Produce the report** using `references/report-template.md`. Keep it short; one precise design signal beats many generic comments.

## The Three Checks (summary)

- **Missing Path** — the agent struggled to find context that should have been easy to reach (locality signal). **Purpose: prevent future omission risk** — keep the modification closure discoverable so the next change finds sibling edits and existing implementations instead of missing or re-creating them. Allowed response: a small **locality repair** to an existing destination.
- **Unauthorized Shortcut** — the task crossed a boundary the architecture meant to preserve (boundary signal). **Purpose: keep design boundaries trustworthy** — a boundary is only useful if you can trust it always holds. A single bypass breaks that trust: future modifiers can no longer rely on the boundary as a guarantee and must reason about the internals it was meant to hide, raising the context cost of every later change. Allowed response: a small **boundary guard** on an existing boundary.
- **Unowned Capability** — the task revealed a capability with no clear home (ownership signal). **Purpose: make placement predictable** — ownership matters because a clear owner yields a placement rule the modifier can reason about. Given a capability, they can predict where it should live, quickly check whether a usable implementation already exists, and actually find it — so they don't reinvent the wheel. Required response: **detect and report**; escalate the decision.

## Core Rule

Do not introduce a new owned concept, boundary, architectural layer, ownership rule, or shared abstraction unless the user or project instructions explicitly authorize it. When the right design destination is unclear, escalate instead of choosing silently. Full boundary, anti-overreach, and quality criteria: `references/principles.md`.

## Reference files

- `references/checks.md` — detailed signals, allowed responses, and the decision mapping for the three checks.
- `references/principles.md` — what/how boundary, anti-overreach rules, and quality bar.
- `references/report-template.md` — the reflection report format.

## Final Check

Before finishing, verify: (1) inspected how the task found and placed the change; (2) ran all three checks; (3) analyzed ownership if a capability was involved; (4) separated how-level fixes from what-level decisions; (5) proposed only safe repairs and escalated design authority; (6) said so explicitly if no routing issue was found.