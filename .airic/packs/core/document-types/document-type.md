---
id: core.document-type
doc_type: core.document-type
title: Document Type
---

# Document Type

A document type defines what a good document of a certain kind should be.

It gives the agent a standard for reading, reviewing, creating, and editing documents.

A document type is not a rigid schema. It is a quality standard written primarily in prose.

## Purpose

Use a document type when a class of documents needs stable expectations.

A good document type helps the agent understand:

- what the document is for
- what it should contain
- what makes it useful
- what makes it incomplete
- how it should be reviewed
- how it should be improved

## What a Document Type Should Contain

A document type should define:

- the purpose of the document
- when this document type should be used
- what good examples usually clarify
- what common failure modes to avoid
- how the agent should help edit or review it

It may describe expected sections, but sections are guidance, not mandatory structure unless explicitly stated.

## What a Document Type Should Avoid

A document type should not overfit to one document instance.

It should not become:

- a template for a single file
- a workflow
- a task instruction
- a hidden data schema
- a checklist that replaces judgment

If a concept is specific to a domain, it should usually live in a scenario pack, not in Core Pack.

## Editing Guidance

When editing a document-type document:

- preserve the document type's semantic purpose
- keep standards general enough to apply across many documents
- avoid excessive examples that narrow the concept
- separate quality criteria from process steps
- prefer prose standards over rigid fields
