---
name: cmp-clean-architecture-planner
description: Use before implementing a non-trivial coding task — features, bug fixes, refactors, business-rule changes, new external integrations, or any change touching use cases, entities, ports, adapters, controllers, mappers, repositories, or tests. Produces a modification plan that separates policy from mechanism, locates the owning use case and layer, plans ports/adapters/tests, and makes human-owned design decisions explicit in the plan for review. Skip trivial formatting-only, comment-only, mechanical dependency-bump, or generated-only changes.
---

# CMP Clean Architecture Planner

This skill assumes the project has already chosen Clean Architecture (or a Hexagonal / ports-and-adapters style). That decision is settled and this skill does not re-evaluate it. The skill's job is to make a better implementation plan inside that architecture — one that completes the current task and keeps future modifications cheap to route.

## Mental Model (read before the workflow)

The workflow below depends on this way of thinking. Read it first; the steps only make sense on top of it.

### Judgment standard: CMP

> For the modifications a system must realistically support, a design is better when the sufficient context required for correct modification is cheaper to acquire.

A good plan completes the task AND preserves the codebase's ability to route future changes cheaply: policy where future policy changes will look, mechanism where future mechanism changes will look, use cases readable as application behavior, ports client-authored, adapters behind ports, dependencies pointing inward.

### Clean Architecture is a context-routing system

CA makes future modification cheap by giving humans and agents reliable routes to the context a change needs. It does this through five mechanisms:

1. **What/How separation** — policy (what the system does) lives inward; mechanism (how it's done) lives outward.
2. **Use cases own application behavior** — a use case owns the ordered policy narrative of a business process; route feature changes there first.
3. **Entities own stable invariants** — business rules true regardless of flow, storage, UI, or infrastructure.
4. **Ports express needed capabilities** — a port is a client-authored contract shaped by the use case, not by the provider.
5. **Dependency rule protects routing trust** — source dependencies point inward; inner policy never imports outer mechanism.

### Policy vs mechanism (the load-bearing distinction)

Every step classifies work along this line.

- **Policy (inward):** entities, domain rules, invariants, use cases, application flow — decisions that should survive framework / DB / vendor / UI changes.
- **Mechanism (outward):** controllers, UI, HTTP, DB/ORM, SDKs, queues, file systems, framework wiring, serialization, transport DTOs.

Keep policy out of outer mechanism; keep mechanism out of inner layers.

### Authority boundary (single source of truth for overreach)

**Agent may plan/implement (how-level, when it fits existing architecture):** adapter / mapper / DTO implementation, repository behind an existing port, controller or delivery wiring, test scaffolding, using an existing port, adding tests for an existing use case, moving code back behind an existing boundary, following an existing placement convention.

**Human owns (what-level — propose, do not decide silently):** new use case boundary, new owned concept, new port or port contract, ownership of a cross-cutting capability, moving policy across modules, changing dependency direction, new placement convention, promoting duplicated logic to shared policy, promoting a local helper to a domain concept, redrawing layer responsibility.

When a what-level decision appears, mark it a human design gate: resolve it in the plan by naming the concept / port / boundary in domain-layer terms and proposing the specific design, so the human can confirm it by reading the plan. Do not implement it silently, and do not turn it into a question. Questions are reserved for unclear requirements (see step 1), never for design decisions.

## When to Use & Which Mode

Installed in this codebase, run this skill before any non-trivial change. Skip only trivial formatting-only, comment-only, mechanical dependency-bump, or generated-only changes.

Once inside the skill, choose a mode (a finer cut than the skip line above):

- **Quick plan** — mechanism-only, single clear use case owner, existing port, no boundary crossing. Produce just intent + change classification + one-line verification, inline.
- **Full plan** — use when any design gate may trigger, a boundary is crossed, ownership/placement is unclear, or multiple layers are touched. Fill `references/plan-template.md`.

If unsure, start full and collapse to quick once you confirm no gate triggers.

## Planning Workflow

Run in order. Ask the human only when intent or requirements are unclear (step 1). A design gate does not call for a question — surface the decision explicitly in the plan and let the human confirm it on review.

1. **Clarify intent.** Behavior to change, behavior to preserve, success criteria, task type. If the product or domain *requirement* is ambiguous, ask — this is the one place a question belongs. Do not guess product or domain ambiguity. Design decisions are handled differently: you resolve those in the plan rather than by asking (see step 8).
2. **Classify the change.** Tag each item: entity-invariant / use-case-policy / port-contract / adapter-mechanism / delivery-mechanism / persistence-mechanism / mapping-dto-serialization / test-verification / ownership-placement / architecture-boundary. Policy routes inward; mechanism stays outward.
3. **Locate in CA coordinates.** Give each change a vertical owner (which use case/process) and a horizontal layer (entity / use case / port / adapter / delivery / persistence / mapper / test). No clear vertical owner → ownership-needed; unclear layer → placement-review.
4. **Plan context acquisition.** Start from the root `architecture-map.md` (create it from `references/architecture-map-template.md` if it does not exist), then inspect in order: tests → owning use case → entities → existing ports → adapters → delivery entry points → persistence/external details → mappers/DTOs/fixtures → conventions. Mark each must-inspect / may-inspect / do-not-need. Do not read the whole repo unless the route is missing.
5. **Predict the modification closure.** List artifacts that change or must be verified together. Update as you learn more.
6. **Check boundary trust.** For each boundary: is the port use-case-shaped (not provider-shaped)? failure modes and side effects explicit? dependency pointing inward? Mark trusted / verify / untrusted. Repair an untrusted boundary as how-level work, or, if it must be redrawn, handle it as a design gate (step 8) — propose the redraw in the plan for confirmation.
7. **Plan ports & adapters.** Existing port fits → use it, keep provider details behind the adapter. Almost fits → propose adjustment, mark how- vs what-level. None fits → new-port-needed; propose it in use-case language in the plan and mark it for human confirmation on review, rather than asking mid-plan. Never shape a port by copying the provider; never import SDK/ORM/HTTP/persistence types inward.
8. **Run human design gates.** Check each gate (new use case / new owned concept / new port / port contract semantics / capability ownership / placement rule / dependency-direction change / shared-policy extraction). Any triggered gate → resolve it in the plan: name it and propose the specific decision in domain-layer terms (the entity field, the use-case step, the port and its contract) so it lands where the human reviews. Do not implement a what-level decision silently, and do not raise it as a question — the human confirms it by reading the plan. Only an unclear *requirement* behind the gate goes back as a question (step 1).
9. **Produce the implementation route.** Follow CA direction; drop steps with no real change, and do not skip a step that has one.
10. **Plan verification at the right level.** Entity invariant → entity tests; use case policy → use case tests with fake ports; port contract → contract tests; adapter → integration/mechanism tests; delivery/persistence mapping → controller/repo/mapper tests; dependency rule → lint/static check. Avoid leaning only on E2E when a local test expresses the policy better.
11. **Update the architecture map.** If this change created or moved a route, update the root `architecture-map.md` per the rules in "Architecture Map". Record only approved structural decisions; if nothing structural changed, leave it untouched.

## Output

- **Quick plan:** intent + change classification + one-line verification, inline.
- **Full plan:** fill `references/plan-template.md`.
- A filled end-to-end example is in `references/worked-example.md`.

## Architecture Map

This codebase keeps a routing index at `architecture-map.md` in the project root — the persistent map of use cases, ports/adapters, entities, conventions, and known boundary debts. It is the durable counterpart to a single task's plan: a plan routes one change; the root map keeps routes cheap across changes.

- **Bootstrap if missing.** If the root `architecture-map.md` does not exist, create it from `references/architecture-map-template.md` and fill it from the current codebase. The template is a blank scaffold; the root file is the live map the skill reads and maintains.
- **Entry point for context acquisition.** Read the root map at the start of Workflow step 4, then drill into code. Trust but verify: correct a stale entry as you go, or escalate if the gap touches a gate.
- **Maintained automatically as the last step of a change.** Update the root map only when a structural fact changes (new/renamed use case, new/removed port or adapter, changed contract semantics, changed invariant ownership, changed convention or dependency rule, introduced/resolved boundary debt, opened/closed ownership question). Leave it untouched otherwise.
- **The map records decisions; it does not make them.** Recording an approved structural decision is how-level bookkeeping the agent may do. Adding an entry for an unapproved new use case, port, owned concept, or convention is a what-level decision and stays behind a human design gate. Never use a map edit as a backdoor to introduce a boundary.

The blank format lives in `references/architecture-map-template.md`.

## Final Check (before coding)

1. Behavior intent clear? 
2. Policy / mechanism / boundary / placement? 
3. Clear use case owner? 
4. Layer placement clear? 
5. Modification closure explicit? 
6. Boundaries trusted or marked? 
7. Ports client-authored and use-case-shaped? 
8. Any human design gate triggered? 
9. Tests at the right level? 
10. Does the plan improve future context routing, not just finish the task?
11. Architecture map updated if a route changed?

If a gate is triggered, capture the decision explicitly in the plan and get the human's confirmation on the plan before implementing it — no question needed unless the requirement behind it is unclear.