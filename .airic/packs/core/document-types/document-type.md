---
id: core.document-type
doc_type: core.document-type
title: Document-Type Spec
---

# Document-Type Spec

A document-type spec describes what a good user document of that type should contain.

Document-type specs are resolved when a user markdown file explicitly declares `doc_type` in frontmatter (for example `doc_type: core.decision`).

## Frontmatter

- `id`: unique document-type identifier (for example `core.decision`)
- `doc_type`: must be `core.document-type`
- `title`: human-readable name

## Body

Describe the purpose, expected sections, quality bar, and review criteria for documents of this type.

Concrete document-type instances (such as decision or note) are installed under `.airic/specs/document-types/`, not in the core pack.
