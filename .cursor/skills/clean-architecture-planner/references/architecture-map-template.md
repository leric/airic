# Architecture Map — Template

Blank scaffold for a codebase's routing index. The skill copies this to `architecture-map.md` in the project root when no map exists yet, then fills and maintains that root copy. Do not edit this template per task — edit the root `architecture-map.md`. Maintenance rules live in SKILL.md ("Architecture Map").

When generating the root file, replace this header with the project name and:

- Last updated:
- Architectural decision owners:

## Layer layout

Where each layer physically lives.

| Layer | Location (path / module) | Notes |
|---|---|---|
| Entities / domain |  |  |
| Use cases / application |  |  |
| Ports (interfaces) |  |  |
| Adapters (infrastructure) |  |  |
| Delivery (controllers / UI / API) |  |  |
| Persistence |  |  |
| Tests |  |  |

## Use case catalog (vertical owners)

The primary routing table: which business process owns which behavior. Workflow step 3 starts here.

| Use case | Purpose (one line) | Location | Ports used | Key entities |
|---|---|---|---|---|
|  |  |  |  |  |

## Ports & adapters registry

Check here before creating a new port (Workflow step 7).

| Port | Capability (use-case language) | Location | Adapters | Contract test |
|---|---|---|---|---|
|  |  |  |  |  |

## Core entities & invariants

Where stable business rules live.

| Entity / value object | Owns (invariant) | Location |
|---|---|---|
|  |  |  |

## Conventions & placement rules

How new things are placed, so changes follow existing routes (Workflow steps 4 and 8).

- New use case →
- New port →
- New adapter →
- Naming conventions →
- Dependency-rule enforcement (lint / arch test) →
- Other →

## Boundary debts (known untrusted routes)

Boundaries to not trust casually (Workflow step 6). Recording them prevents re-discovery and silent bypass.

| Boundary | Problem | Risk if bypassed | Owner / status |
|---|---|---|---|
|  | provider-shaped / leak / missing contract / wrong dependency direction |  |  |

## Open ownership questions

Capabilities whose owner is not yet settled. Route here to escalate consistently instead of guessing.

| Capability / concern | Candidate owners | Decision needed |
|---|---|---|
|  |  |  |
