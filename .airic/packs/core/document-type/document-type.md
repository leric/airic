---
id: core.document-type.document-type
doc_type: core.document-type
title: Document Type
---

A document type defines what a good document of a certain kind should be. It gives the agent a standard for reading, reviewing, creating, and editing documents of that kind — a quality standard written primarily in prose, not a rigid schema, template, or workflow.

This type is self-describing: it defines every spec type — mode, process, tool, and document-type itself. Adding a new type means writing one more document that conforms to this definition; the kernel needs no code change.

### Purpose

Use a document type when a class of documents needs stable expectations. A good one helps the agent understand:

- what the document is for
- what it should contain
- what makes it useful, and what makes it incomplete
- how it should be reviewed and improved

### Required frontmatter (on each instance)

- `id`: unique identifier, e.g. `core.document-type.task`.
- `doc_type`: must be `core.document-type`.
- `title`: human-readable name.

A user document opts into type-aware editing by setting its own `doc_type` to a document type's `id`. A file with no `doc_type` is ordinary text; the kernel never infers a type.

### How it loads

A document-type spec enters context as `## Document-Type Spec` only when the current or focused document declares a matching `doc_type`. It is re-read each tool round, since the file may change. Cost is paid only when a document of this type is open, so a type can afford to be thorough.

### What an instance should contain

- the purpose of the document
- when this type should be used
- what good instances usually make clear
- common failure modes to avoid
- how the agent should help review and edit it

It may describe expected sections, but sections are guidance, not mandatory structure unless explicitly stated.

### What an instance should avoid

Do not overfit one instance. A document type should not become:

- a template for a single file
- a workflow or task instruction
- a hidden data schema
- a checklist that replaces judgment

### Editing guidance

- preserve the type's semantic purpose
- keep standards general enough to apply across many documents
- avoid excessive examples that narrow the concept
- separate quality criteria from process steps
- prefer prose standards over rigid fields
