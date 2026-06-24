# The Three Checks — detail

## 1. Missing Path (locality signal)
Question: Did the agent struggle to find context that should have been easy to reach?
Purpose: prevent future omission risk — keep the modification closure discoverable so the next modifier doesn't miss sibling changes or reimplement existing code.

Signals:
- Had to search widely to find the relevant file, test, helper, schema, registry, or existing implementation.
- A relevant existing capability was hard to discover.
- Related artifacts existed but were not connected by naming, placement, tests, docs, imports, or local structure.
- The task touched multiple places that must stay consistent, but the codebase did not expose them as a modification closure.
- A future modifier could land on one file and miss sibling changes.
- The agent almost reimplemented something that already existed.

Allowed response — **locality repair** (only when the destination already exists and no new design decision is created):
- Improve a misleading name; add a pointer comment to the canonical implementation.
- Add a README note near the module; add or fix a test name that points to intended behavior.
- Add a registry entry if the registry already exists and the pattern is established.
- Move a small item to the existing conventional location when the convention is already clear.

Do not introduce a new registry, shared abstraction, or ownership model as a "locality repair." That is design work — escalate.

## 2. Unauthorized Shortcut (boundary signal)
Question: Did the agent complete the task by crossing a boundary the architecture meant to preserve?
Purpose: keep design boundaries trustworthy — a boundary is only useful if you can trust it always holds. A single bypass breaks that trust: future modifiers can no longer rely on the boundary as a guarantee and must reason about the internals it was meant to hide, raising the context cost of every later change.

Signals:
- Accessed internals, private state, low-level details, or the wrong layer.
- Bypassed an existing service, adapter, policy, repository, API, validator, state machine, or contract.
- Duplicated logic instead of using the intended boundary.
- Made one layer aware of another layer's implementation details.
- Succeeded via a direct route that future changes could copy.
- Tests pass, but the patch weakens routing rules.

Allowed response — **boundary guard** (only when the intended boundary already exists and the correction is local):
- Move the call back through the existing public contract.
- Add a contract test for an existing boundary.
- Rename a boundary method to make the intended route clearer.
- Document a forbidden dependency with a short comment.
- Replace direct access with an existing adapter, service, policy, or interface.

Do not create a new boundary or redesign the layer structure without human approval.

## 3. Unowned Capability (ownership / placement signal)
Question: Did the task reveal a capability with no clear home?
Purpose: make placement predictable — ownership matters because a clear owner yields a placement rule the modifier can reason about. Given a capability, they can predict where it should live, quickly check whether a usable implementation already exists, and actually find it — so they don't reinvent the wheel.

Signals:
- Had to choose where to place new logic without a clear convention.
- Similar logic exists in multiple locations with no canonical owner.
- A helper was added locally but looks likely to be reused.
- A rule spans multiple modules, but no module clearly owns it.
- Placement was chosen for convenience, not architectural ownership.

Required response — **detect and report** (do not silently decide ownership). Surface:
- What capability was discovered?
- Where was it placed in the current patch?
- Why is that placement potentially unstable?
- Which possible owners exist?
- What decision should a human make?

Outputs: `ownership-needed`, `placement-unclear`, or `duplication-risk`.
