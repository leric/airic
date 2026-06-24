
# Full Plan Template

Use when the workflow calls for a full plan. Fill each section; keep cells terse.

## 1. Intent
- Task type:
- Intended behavior change:
- Behavior to preserve:
- Success criteria:
- Ambiguities:

## 2. Change classification

| Item | Classification | Policy / mechanism / boundary / placement | Reason |
|---|---|---|---|
|  |  |  |  |

Classification ∈ entity-invariant / use-case-policy / port-contract / adapter-mechanism / delivery-mechanism / persistence-mechanism / mapping-dto-serialization / test-verification / ownership-placement / architecture-boundary

## 3. CA coordinates

| Planned change | Vertical owner (use case) | Horizontal layer | Reason |
|---|---|---|---|
|  |  |  |  |

Layer ∈ entity / use case / port / adapter / delivery / persistence / mapper / test. No vertical owner → ownership-needed; unclear layer → placement-review.

## 4. Context acquisition plan

| Context target | Inspect level | Why |
|---|---|---|
|  |  |  |

Inspect level ∈ must-inspect / may-inspect / do-not-need

## 5. Predicted modification closure

| Artifact | Role | Required? | Why |
|---|---|---|---|
|  |  |  |  |

Role ∈ primary / sibling / downstream / verification. Required ∈ yes / maybe / no.

## 6. Boundary trust check

| Boundary | Trust level | Need to cross? | Reason |
|---|---|---|---|
|  |  |  |  |

Trust ∈ trusted / verify / untrusted

## 7. Human design gates

| Gate | Triggered? | Required human decision |
|---|---|---|
| New use case |  |  |
| New owned concept |  |  |
| New port |  |  |
| Port contract semantics |  |  |
| Capability ownership |  |  |
| Placement rule |  |  |
| Dependency-direction change |  |  |
| Shared-policy extraction |  |  |

## 8. Implementation route

Follow CA direction; drop steps with no change.

```
delivery input → input boundary / DTO mapping → use case policy → entity invariant → port contract → adapter mechanism → output boundary / presenter / response mapping → tests
```

1.
2.
3.

## 9. Verification plan
- Tests to add/update:
- Tests to run:
- Architecture checks to run:
- Manual review focus:

## 10. Agent permissions
- Agent may change:
- Agent must NOT change without human approval:

## 11. Next step
One of: proceed with implementation / submit the plan for human confirmation (including any flagged design gates) / ask the human to clarify an unclear requirement / inspect more context first.


