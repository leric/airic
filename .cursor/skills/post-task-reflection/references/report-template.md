## CMP Post-Task Reflection

Keep it short — one precise design signal beats many generic comments. Use "—" for any section that does not apply.

### 1. Context this change needed
What the change actually touched and what had to stay consistent — the modification closure (entry point, files, tests, helpers, sibling edits).

### 2. What was hard to find or follow (locality — Missing Path)
Misleading, missing, or weak routing signals; artifacts not connected by naming, placement, tests, docs, or imports; anything found only by a wide search, or an existing implementation nearly re-created.

### 3. Boundaries crossed (boundary — Unauthorized Shortcut)
Did the change route through the intended seams, or reach into internals / bypass an existing service, adapter, policy, contract, or layer? Note any direct route a future change could copy.

### 4. Capabilities without a clear home (ownership — Unowned Capability)
New, duplicated, or cross-cutting logic placed by convenience with no canonical owner — where a future modifier couldn't predict it lives.

### 5. Design issue revealed
Pull sections 2–4 together: which check(s) actually fired — Missing Path, Unauthorized Shortcut, Unowned Capability, or "none" — with the evidence. Mark each how-level (safe to repair) or what-level (needs human design authority).

### 6. Suggested improvement
Describe the smallest safe change concretely — what to do and where — and tag its urgency: **Do now** (small, safe, how-level), **Schedule later** (worth doing, not urgent, or needs a human decision), or **Just note** (record the signal; no action yet). A how-level fix (rename, pointer comment, test, routing a call through an existing boundary) is safe to apply. If it would introduce a new concept, owner, boundary, or placement rule, that is what-level — do not apply it; flag it for a human instead.

### 7. Why this helps
How this lowers the context cost of the next change — what the next modifier can now find, trust, or rely on.