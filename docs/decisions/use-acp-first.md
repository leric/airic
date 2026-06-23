---
doc_type: core.decision
title: Use ACP first
status: accepted
---

# Use ACP first

## Context

Airic needs an interaction surface for MVP validation. CLI chat adds an intermediate layer without proving the kernel in a real editor workflow.

## Decision

Use ACP as the first client interface. Skip CLI chat for MVP.

## Consequences

- Kernel stays UI-agnostic; ACP remains an adapter.
- Zed and other ACP clients can connect directly.
- CLI can be added later as another adapter.
