---
id: packman.process.define-doctype
doc_type: core.process
title: Define Document-Type
summary: Extract and draft one of the methodology's document types—the quality standard for a recurring kind of artifact—as a core.document-type document.
activation: suggested
triggers:
  - The pack needs one of its document types written or revised.
  - A piece of the methodology is a recurring kind of artifact with its own sense of what "good" means.
outputs:
  - core.document-type
---

### What it does

A document-type captures the standard for one recurring kind of artifact in the methodology: what a good instance of it is for, what it contains, and what it avoids—written as prose quality criteria, not a rigid schema, template, or workflow. `define-doctype` is extract applied to the document-type construct; it produces one `core.document-type` document, drafted against core's `core.document-type` definition (which is self-describing—it defines every spec type, including itself).

The loading model lets it be generous. A document-type spec enters context as `## Document-Type Spec` only when the open or focused document declares a matching `doc_type`, and it is re-read each round in case the file changed. Because that cost is paid only while a document of this kind is open, a document-type can afford to be thorough—write the standard fully rather than tersely.

### Steps

These are an authoring order, not a rigid sequence—expect to loop back as the purpose and the criteria sharpen each other.

1. **Confirm it is really a document-type.** Check the piece is a recurring *kind of artifact* with stable expectations—not a flow (that belongs in a process) or a standing posture (that belongs in the mode). The test: would many documents of this kind share the same notion of "good"? A one-off template for a single file is not a document-type.
2. **Start from the source, and pull it toward the concrete.** As with any extract, your material is the documents describing the methodology plus what the user tells you. Ground it in real artifacts: gather a few actual instances the user considers good—and, if you can, a weak one—and read what genuinely distinguishes them, so the standard comes from real examples rather than an idealized spec.
3. **State the purpose and when to use it.** What this kind of document is for, and the situations that call for it. This anchors everything else in the standard.
4. **Capture what a good instance makes clear.** The substance of the standard: what good instances contain and convey, what makes them useful, and what leaves them incomplete. Describe expected sections if it helps, but as guidance—keep it prose criteria, not a mandatory schema.
5. **Name the failure modes.** The ways an instance goes thin, wrong, or overfit—the mistakes worth warning against.
6. **Say how the agent should review and edit it.** How to help improve a document of this kind: what to check, what to preserve, and what to push on.
7. **Set the frontmatter.** id / doc_type (`core.document-type`) / title. Recall that a user document opts into type-aware editing by setting its own `doc_type` to this id; the kernel never infers a type, so the id must be stable and unambiguous.
8. **Check the altitude and generality.** Re-read and make sure the standard holds across many instances of the kind, not just the examples you drew from. Pull out anything that is really a workflow (push it into a process), a posture (push it into the mode), a hidden data schema, or a checklist that would replace judgment.

### Reference: the shape a document-type tends to take

The steps above typically produce a document-type with these parts. Treat the `core.document-type` definition as the formal quality bar; this is the working shape, not a rule:

- **Frontmatter** — id / doc_type / title.
- **Definition** — what this kind of document is, in a line or two.
- **Purpose** — what it is for, and when to use it.
- **What a good instance contains** — the prose quality criteria (sections optional, offered as guidance).
- **Failure modes to avoid** — what makes an instance weak, wrong, or overfit.
- **Review & editing guidance** — how the agent helps improve one.

### Guidance

- **A standard, not a template.** A document-type says what "good" means across many instances; it is not a fill-in template for one file, a workflow, a data schema, or a checklist that replaces judgment.
- **Prose over schema.** Prefer prose criteria to rigid fields; describe expected sections only as guidance unless the kind genuinely requires fixed structure.
- **Keep it general.** Write standards broad enough to apply across many documents; resist overfitting to the few instances you extracted, and avoid piling on examples that narrow the concept.
- **Separate quality from process.** Quality criteria belong here; the steps for producing the artifact belong in a process. Keep the two apart.
- **Extract, do not invent.** The standard is the user's own sense of a good artifact made explicit and named—you structure it, they own the substance.
- **Draft against `core.document-type`.** Use core's `core.document-type` definition as the bar for structure and completeness; note it is self-describing, so this process produces documents of the same family as core's own type specs.
- **It can afford to be thorough.** Cost is paid only while a document of this type is open, so write the standard fully rather than trimming it for context.
