---
doc_type: core.decision
title: Use Clean Architecture monolith
status: accepted
---

# Use Clean Architecture monolith

## Context

Airic MVP needs fast iteration with coding-agent assistance while keeping boundaries clear enough to evolve.

## Decision

Build one repository as a Clean Architecture monolith with domain, application, infrastructure, and interface layers.

## Consequences

- Single deployable app for MVP.
- ACP, LLM, and filesystem remain replaceable via ports.
- Splitting into services can happen later if needed.
