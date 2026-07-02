---
id: packman.process.define-mode
doc_type: core.process
title: Define Mode
summary: Extract and draft one of the methodology's modes—the stage and mindset it puts the user in, and how the agent carries the user through that stage's tasks—as a core.mode document.
activation: suggested
triggers:
  - The pack needs its mode written or revised.
  - The user wants to pin down who the agent is and how it thinks in this methodology.
outputs:
  - core.mode
---

### What it does

A mode captures one *stage* of a methodology: a distinct way of thinking the user steps into to do a certain kind of work. Crucially, the mode document does not just declare an identity—it specifies how the agent concretely behaves so the user adopts that mindset and gets through the tasks that belong to the stage. `define-mode` is extract applied to the mode construct; it produces one `core.mode` document, drafted against core's `core.mode` definition.

The active mode's body is always in the system prompt, so it is the most consequential spec the agent carries; a methodology may have several modes (one per stage) and switch between them at runtime. Because the mode sets the stage's mindset and lays out its whole task landscape, getting its framing and completeness right matters more than keeping it short.

### Steps

These are an authoring order, not a rigid sequence—identity, map, and principles co-evolve, so expect to loop back.

1. **Start from the source, and pull it toward the concrete.** Usually your input is the documents that describe the methodology, plus what the user tells you. Read those sources closely, and wherever the description stays abstract or aspirational, ground it: ask the user for real instances of this stage in action—what they actually do, decide, and say—so the mode reflects how the work really goes, not an idealized picture.
2. **Name the stage and the mindset it induces.** What kind of work is this stage, and what way of thinking should the user be in while doing it? (For packsmith: the stage of forging a methodology into a pack, in a goal-driven, extract-minded frame.) This mindset is the mode's target—everything else exists to get the user into it and keep them there.
3. **Capture the worldview the stage presupposes.** The conceptual frame the agent and user reason inside during this stage (for packsmith: how the four constructs express a methodology). Make it explicit; the rest of the mode builds on it.
4. **Specify how the agent carries the user through the stage.** This is the heart of the document: concretely, what the agent leads on, what it presses for, how proactive it is, and what it refuses to do for the user—so the user stays in the mindset and the stage's tasks actually get done. Write behavior, not a static self-portrait. Name the signature action if the stage has a core move (for packsmith: *extract*), watching for collisions with kernel primitives.
5. **Build the high-level map.** The processes and doctypes this stage draws on, each one's role, and how they cooperate. This is the mode's unique responsibility: processes and doctypes load in isolation and cannot see each other, so only the mode can give the overview.
6. **Distill the judgment principles.** State the stage's constant judgment dispositions—the "how it decides" that is not a step-by-step process. Keep what must remain human judgment as judgment; do not harden it into steps.
7. **Draw the boundary.** State what is a given premise, outside this pack's scope to change, so the agent does not overreach.
8. **Check the altitude.** Re-read every line and ask whether it sits at the mode's operating altitude. Pull out anything that is either settled architecture the pack cannot change (move it to the boundary, or drop it) or process/doctype-level detail (push it down into the relevant spec). The mode holds only what is constant and cross-cutting for the stage.

### Reference: the shape a mode tends to take

The steps above typically produce a mode with these sections. Treat the `core.mode` definition as the formal quality bar; this is the working shape, not a rule:

- **Stage & mindset** — the stage this mode is for and the way of thinking it puts the user in.
- **Worldview** — the conceptual frame the stage presupposes.
- **Agent behavior** — how the agent carries the user through the stage's tasks while holding that mindset (the core of the document).
- **Methodology map** — the processes and doctypes the stage draws on and how they cooperate.
- **Judgment principles** — the constant dispositions behind its decisions.
- **Boundary** — the given premises it must not touch.

### Guidance

- **A mode is behavior, not a portrait.** The identity and mindset exist to change how the user works during the stage—spend the document on what the agent concretely does to induce that and drive the stage's tasks, not on describing a persona.
- **Do not optimize for shortness.** The mode is resident and loads once per session; write it as long as the identity, map, and principles genuinely need. Never cut the map to save tokens.
- **Extract, do not invent.** The mode's content is the user's methodology made explicit and named—you name and structure it, the user owns the substance.
- **The map is the mode's job alone.** Since processes and doctypes cannot see each other, the mode is the only place their cooperation is stated. Keep it current as specs are added or renamed.
- **Draft against `core.mode`.** Use core's `core.mode` definition as the bar for structure and completeness.
- **Watch for altitude drift.** The most common failure is smuggling in settled premises (they belong in the boundary) or process detail (it belongs in the process).
