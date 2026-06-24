# Principles

## What / How boundary
Classify every recommendation as `how-level` or `what-level`.

How-level (agent may perform when small and safe):
- Rename a local function for clarity.
- Add a test for behavior just implemented.
- Route a call through an existing boundary.
- Add a pointer to an existing canonical implementation.
- Use an existing registry, adapter, or module convention.
- Remove accidental duplication created during the task.

What-level (requires human approval):
- Introduce a new owned concept, boundary, or architectural layer.
- Decide which module owns a cross-cutting capability.
- Create a new shared abstraction or placement rule.
- Change dependency direction or redraw layer responsibility.
- Decide that duplicated logic should become a common policy.
- Decide that a one-off helper is now a domain concept.

When reflection reaches a what-level issue, produce a recommendation for human review instead of changing the design.

## Anti-overreach rules
Do not:
- Introduce a new owned concept, boundary, or capability ownership without approval.
- Create a shared abstraction because something might be reused.
- Turn every duplicate into a common module.
- Redesign architecture after a local task.
- Hide a what-level decision inside a how-level implementation.
- Treat passing tests as proof the design route was correct.
- Treat local convenience as placement authority.

## Quality bar
A good reflection:
- Reads the actual context-routing trace of the task.
- Identifies whether the task exposed Missing Path, Unauthorized Shortcut, or Unowned Capability.
- Preserves the what/how boundary and distinguishes safe local repairs from human design decisions.
- Uses ownership / placement analysis to prevent duplication.
- Produces small, actionable recommendations — and recommends no action when none is needed.

A bad reflection:
- Gives generic code-quality comments or re-explains the implementation.
- Recommends abstractions without ownership analysis.
- Silently creates new concepts or boundaries.
- Makes broad architecture recommendations from weak task evidence.
