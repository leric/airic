---
id: packkman.process.define-process
doc_type: core.process
title: Define Process
summary: Extract and draft one of the methodology's processes—a repeatable flow with a clear trigger, steps, and output—as a core.process document.
activation: suggested
triggers:
  - The pack needs one of its processes written or revised.
  - A piece of the methodology is a repeatable flow (clear trigger, steps, output), not a posture or an artifact standard.
outputs:
  - core.process
---

### What it does

A process captures one repeatable method in the methodology: work that has a recognizable trigger, input, steps, output, and exit condition. `define-process` is extract applied to the process construct; it produces one `core.process` document, drafted against core's `core.process` definition.

The loading model shapes how you write it. A process loads two-tier: while inactive, only its frontmatter index (id / summary / triggers / activation) is resident under `## Available Processes`; when it activates, the full body is injected as `## Active Process` and refines the mode—it never replaces it. So the frontmatter is always paying context and must earn its place, while the body only needs to be complete once active. At most one process runs at a time.

### Steps

These are an authoring order, not a rigid sequence—expect to loop back as trigger, steps, and output sharpen each other.

1. **Confirm it is really a process.** Check the piece is a repeatable flow, not a standing posture (that belongs in the mode) or an artifact standard (that belongs in a document-type). The test: does it have a clear trigger, input, steps, output, and exit condition? If its "steps" are really human judgment that cannot be reduced to a followable sequence, say so rather than forcing it into a process.
2. **Start from the source, and pull it toward the concrete.** As with any extract, your input is usually the documents describing the methodology plus what the user tells you. Ground it in a real instance: walk the user through the last time they actually ran this flow—what set it off, what they had in hand, what they did, what came out—so the steps reflect real practice, not an idealized routine.
3. **Pin the trigger and preconditions.** When is this process worth starting, and what must be true before it can begin? These become the `triggers` and open the body. Decide `activation`: `manual` if only the user should start it, `suggested` if the agent may propose it (activation is always visible either way).
4. **Name the input and the output.** What the process consumes to begin, and what concrete artifact it produces. If the output is a document type, list it in `outputs`—and it must be a real doctype in this pack or in core.
5. **Lay out the steps.** The core of the body: a sequence concrete enough that another agent can follow it consistently. Keep each step followable; where a step turns on human judgment, mark it as a judgment point rather than faking a mechanical rule.
6. **State the exit condition and failure handling.** When is the process done, and what to do when it stalls or hits a blocker? Do not leave the flow open-ended.
7. **Say how the result is written back or handed off.** Where the output goes—written into a document, handed to another process, or surfaced to the user for a decision.
8. **Write the frontmatter index tight.** Because id / summary / triggers / activation stay resident whether or not the process runs, phrase them so the agent can tell at a glance when to reach for this process. Trim anything that does not help that decision.

### Reference: the shape a process tends to take

The steps above typically produce a process with these parts. Treat the `core.process` definition as the formal quality bar; this is the working shape, not a rule:

- **Frontmatter** — id / doc_type / title / summary / triggers / activation / outputs.
- **Trigger & preconditions** — when to start, and what must hold first.
- **Input** — what the process consumes.
- **Steps** — the followable sequence at the heart of the body, with judgment points marked.
- **Output** — the concrete artifact produced.
- **Exit condition** — when the flow is done.
- **Failure / blocker handling** — what to do when it stalls.
- **Write-back / hand-off** — where the result goes.

### Guidance

- **A process is followable; a mode is not.** If what you are writing is really a standing posture, it belongs in the mode; if it is a quality bar for an artifact, it belongs in a document-type. Keep define-process to genuine flows.
- **Keep the index cheap.** Frontmatter is resident whether or not the process runs, so summary and triggers must be tight and decision-useful; the full body only needs to be complete once active.
- **Do not crush judgment into steps.** Where the flow needs a human call, surface the boundary as a judgment point instead of inventing a mechanical rule.
- **Extract, do not invent.** The steps are the user's actual method made explicit and named—you structure it, they own the substance.
- **Draft against `core.process`.** Use core's `core.process` definition as the bar for structure and completeness.
- **Watch the altitude.** A process holds exactly one flow: push standing posture up into the mode, push artifact standards out into the document-type, and keep settled architecture out entirely.
