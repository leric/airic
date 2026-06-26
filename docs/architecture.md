# Airic Layered Architecture

## 1. Purpose

Airic is a document-defined agent system.

Its central product idea is:

> The agent’s behavior logic is exposed as ordinary Markdown documents.

In Airic, the rules that guide the agent are not hidden inside opaque system prompts, hard-coded workflows, or vendor-controlled agent policies. They live in files that the user can open, read, edit, version, fork, and compose.

This is the main difference between Airic and a conventional agent framework.

A conventional agent system usually says:

```text
Here is an agent. Trust how it behaves.
```

Airic says:

```text
Here are the documents that define how the agent behaves.
Read them. Edit them. Replace them. Extend them.
```

This document explains the architectural relationship between:

* Airic Kernel
* Core Pack
* Extension Packs
* User Workspace

It also defines the boundary between runtime mechanism and document-defined behavior.

---

## 2. Core Proposition: Agent Behavior as Editable Documents

Airic treats agent behavior as a user-visible control plane.

The following agent behavior rules are defined through Markdown documents:

```text
- how the agent thinks
- what role or mode it is currently using
- what makes a document good
- when a process should start or end
- how tools should be used
- what risks a tool carries
- what counts as an executable task
- how reusable human judgment becomes precedent
- how a scenario-specific workflow should operate
```

These documents are not passive documentation.

They are runtime inputs.

The kernel reads them, indexes them, loads the relevant ones into context, and uses them to shape the agent’s behavior.

This gives Airic several important properties:

```text
Inspectable
  Users can see why the agent behaves a certain way.

Editable
  Users can change behavior by editing Markdown, not by modifying code.

Versionable
  Agent behavior can be tracked in git like source code.

Composable
  Packs can extend each other by adding or refining behavior documents.

Forkable
  A user or team can fork a pack and adapt it to their own working style.

Auditable
  Behavior changes are visible as file diffs, not hidden prompt mutations.
```

In this sense, Airic is not only an agent runtime.

It is an editable operating model for human-AI collaboration.

---

## 3. Architecture Overview

Airic is organized into four layers:

```text
User Workspace
  User-owned project files, notes, decisions, tasks, code, drafts.

Extension Packs
  Scenario-specific agent behavior and work methods.

Core Pack
  General-purpose agent behavior, document types, tool policies, and processes.

Airic Kernel
  Runtime primitives, context assembly, session state, tools, and execution.
```

The dependency direction is bottom-up:

```text
Extension Pack
  depends on Core Pack

Core Pack
  depends on Airic Kernel

Airic Kernel
  depends on no pack-specific knowledge
```

The kernel should not know what a founder, researcher, writer, engineer, or manager is.

Those meanings belong to packs.

The kernel only knows how to load and execute document-defined behavior.

---

## 4. Airic Kernel

Airic Kernel is the minimal runtime layer.

It provides the mechanisms that make document-defined agents executable, but it does not define domain behavior itself.

### 4.1 Kernel Responsibilities

The kernel owns:

```text
- session state
- context builder
- mode registry
- document-type registry
- tool registry
- process lifecycle
- task state primitives
- precedent retrieval primitives
- history tree / focus stack
- file operation tools
- tool execution adapters
- edit confirmation and audit log
```

The kernel provides stable primitives such as:

```text
mode
document-type
tool
process
task
precedent
history tree
context builder
```

These are not scenario concepts.

They are generic coordination primitives.

### 4.2 Kernel Non-responsibilities

The kernel should not hard-code:

```text
- how a founder validates an idea
- how a software architect reviews design
- how a writer develops an essay
- how a manager decomposes objectives
- how a reviewer judges quality
- when a specific scenario process should be used
```

The kernel can load, index, and execute documents.

It should not encode the methodology those documents describe.

### 4.3 Kernel as Mechanism Layer

The kernel answers runtime questions like:

```text
What mode is active?
What document is open?
Does this document declare a doc_type?
Which document-type spec should be loaded?
Is a process active?
Which tool documents are relevant?
What history path should enter context?
What files may be read or edited?
Does this edit require confirmation?
Where should tool traces and edit logs be stored?
```

It does not answer judgment questions like:

```text
Is this a good startup idea?
Should this feature be built?
Is this architectural tradeoff acceptable?
What makes this document strategically useful?
```

Those judgments come from Core Pack, Extension Packs, user documents, precedents, and human decisions.

---

## 5. Core Pack

Core Pack defines Airic’s default operating logic.

It is the base layer of document-defined agent behavior. It teaches the agent how to collaborate, how to use kernel primitives, and how to preserve human attention.

Core Pack is not application-specific.

It should be useful across domains.

### 5.1 Core Pack Responsibilities

Core Pack defines general-purpose specs such as:

```text
core.mode
core.document-type
core.tool
core.process
core.task
core.precedent
```

It may include concrete core specs such as:

```text
core.thinking-partner
core.decision
core.task
core.note
core.precedent
core.deep-focus
core.task-decomposition
core.document-review
core.session-reflection
core.precedent-extraction
```

Core Pack defines:

```text
- how the agent should behave as a thinking partner
- what a good decision document contains
- what a good task document contains
- how clarified intent becomes executable work
- how reusable human judgment becomes precedent
- how tools should be used safely
- how process activation should remain visible
- how deep focus should be protected
```

### 5.2 Core Pack as the Default Agent Operating System

Core Pack is the default “user-space operating system” of Airic Agent.

The kernel provides primitives. Core Pack composes those primitives into general working patterns.

Example:

```text
Kernel primitive:
  process.start
  process.complete
  read_file
  edit_file
  create_file

Core Pack behavior:
  Start task-decomposition only when intent is stable.
  Use read_file when relevant context is uncertain.
  Use edit_file only with reviewable diff.
  Complete the process when task documents are produced.
```

This keeps the kernel small while making agent behavior explicit.

### 5.3 Core Pack Should Stay Generic

Core Pack should avoid domain-specific assumptions.

It should not contain startup advice, software architecture doctrine, writing theory, legal reasoning, education workflows, or GTM strategy.

It should define the reusable collaboration substrate:

```text
thinking
clarifying
deciding
documenting
reviewing
decomposing
delegating
using tools
preserving context
extracting precedent
```

Domain-specific logic belongs to Extension Packs.

---

## 6. Extension Packs

Extension Packs define scenario-specific agent behavior.

They build on Kernel primitives and Core Pack concepts to support concrete domains.

Examples:

```text
founder-pack
software-architecture-pack
research-pack
writing-pack
education-pack
personal-gtd-pack
```

An Extension Pack can introduce:

```text
- new modes
- new document types
- new process specs
- new tool usage policies
- scenario-specific precedents
- templates
- examples
- review criteria
- task patterns
```

### 6.1 Extension Pack Responsibilities

An Extension Pack answers scenario questions such as:

```text
What does good work mean in this domain?
What documents should be produced?
What processes should guide the user?
What decisions should be escalated to the human?
What recurring judgments should become precedents?
What tools are useful in this scenario?
What failure modes should the agent avoid?
What should remain under user control?
```

For example, a Founder Pack may define:

```text
founder.idea-validation
founder.problem-hypothesis
founder.customer-interview
founder.competitive-landscape
founder.mvp-scope
founder.launch-readiness
founder.gtm-plan
founder.investor-memo
```

It may also define startup-specific precedents such as:

```text
Do not treat a working prototype as validation.
Do not scale execution ahead of evidence.
Do not confuse launch energy with product-market fit.
Keep founder judgment on irreversible strategic decisions.
```

### 6.2 Extension Packs Are Behavior Packages

An Extension Pack is not just a prompt bundle.

It is a document-defined operating model for a domain.

A good Extension Pack should make its method visible:

```text
What the agent is trying to help with.
How it reasons in this domain.
What documents it produces.
What processes it follows.
What tools it uses.
What judgments it escalates.
What mistakes it tries to avoid.
```

Because these are Markdown documents, a user can adapt the pack instead of merely accepting it.

For example, a founder can edit Founder Pack to reflect their own startup philosophy:

```text
- more evidence-driven
- more sales-led
- more product-led
- more conservative about technical debt
- more aggressive about launch velocity
- more skeptical about AI-generated validation
```

Airic makes these choices part of the workspace, not hidden agent configuration.

### 6.3 Extension Pack Should Not Modify Kernel Semantics

An Extension Pack should not require kernel changes unless it needs a genuinely new primitive.

Most extensions should be pure documents.

If an Extension Pack needs a new executable capability, it should be split into two parts:

```text
Tool implementation:
  A kernel/plugin-level adapter that provides the executable capability.

Tool document:
  A pack-level document that explains when and how the tool should be used.
```

This preserves the separation between capability and behavior.

---

## 7. User Workspace

The user workspace belongs to the user.

Airic may read and edit files when requested, but it should not impose hidden structure on project documents.

User files remain ordinary files:

```text
docs/
src/
notes/
drafts/
research/
tasks/
decisions/
```

Airic only owns `.airic/`.

### 7.1 Pack Documents vs User Documents

Pack documents define agent behavior.

User documents are the artifacts the user actually works on.

```text
Pack document:
  Describes how the agent should behave.

User document:
  Contains project-specific thinking, decisions, tasks, notes, code, or drafts.
```

Pack documents are control plane.

User documents are work product.

### 7.2 User Documents Opt Into Typed Behavior

A user document participates in Airic document-type aware editing only when it explicitly declares `doc_type` in frontmatter.

Example:

```markdown
---
doc_type: core.decision
title: Use document-defined agent behavior
status: draft
---

# Use document-defined agent behavior
```

Without `doc_type`, a file is just a normal file.

This keeps Airic non-invasive.

Airic does not need to own the user’s documents in order to help with them.

---

## 8. Core Entities

Airic Kernel and Packs communicate through a small set of shared entity types.

### 8.1 Mode

A mode defines the broad posture of the agent.

Examples:

```text
core.thinking-partner
founder.startup-advisor
software.architecture-reviewer
```

Mode answers:

```text
What role is the agent playing?
How should it think?
What should it protect?
What should it avoid?
```

A mode usually persists across a session.

### 8.2 Document Type

A document type defines the quality standard for a document.

Examples:

```text
core.decision
core.task
core.precedent
founder.problem-hypothesis
founder.mvp-scope
```

Document type answers:

```text
What should this document contain?
What makes it useful?
What should be explicit?
What omissions would make it weak?
```

A document type does not define a workflow.

It defines an artifact standard.

### 8.3 Tool

A tool defines an executable capability exposed by the kernel or plugins.

Examples:

```text
read_file
edit_file
search_text
process.start
process.complete
task.create
precedent.search
```

A tool has two layers:

```text
Tool implementation:
  The actual executable function.

Tool document:
  The behavioral policy for using the tool.
```

The tool document explains:

```text
when to use it
when not to use it
required preconditions
risk level
context effect
failure handling
audit behavior
user visibility
related tools
```

This makes tool use part of the document-defined behavior model.

The agent does not merely know that a tool exists.

It can also read how the user wants that tool to be used.

### 8.4 Process

A process is a temporary workflow.

Examples:

```text
core.deep-focus
core.task-decomposition
core.document-review
founder.idea-validation
founder.launch-readiness-review
```

Process answers:

```text
When should this workflow start?
What input does it require?
What steps should it follow?
What output should it produce?
When should it complete or cancel?
```

A process defines method.

The kernel manages lifecycle.

### 8.5 Task

A task is an executable contract.

It turns clarified intent into work that an agent can perform with bounded ambiguity.

A good task should include:

```text
goal
context
constraints
acceptance criteria
dependencies
status
decision requests
writeback notes
```

Tasks are the bridge from Deep Focus to execution.

### 8.6 Precedent

A precedent is reusable human judgment extracted from a concrete case.

It helps future agents handle similar situations with less supervision.

A good precedent should include:

```text
source case
judgment
rationale
scope
limits
counterexamples
future-use guidance
```

Precedent is not a rule engine.

It is a memory of judgment.

---

## 9. Runtime Context Composition

Airic context should be assembled from active state, not from flat accumulated history.

A typical runtime context contains:

```text
kernel base instruction
+ active mode spec
+ active document content, if any
+ active document-type spec, if declared
+ active process spec, if any
+ relevant tool documents
+ relevant task / precedent context
+ active history cursor path
+ explicitly loaded file/tool context
```

The context builder should follow these principles:

```text
Load small indexes by default.
Load full specs only when active or directly relevant.
Do not load all pack documents into every prompt.
Do not use flat chronological history as default context.
Do not include side digressions after they have been summarized.
Do not infer persistent document semantics for user files.
```

This keeps Airic behavior precise without letting context grow uncontrollably.

---

## 10. Pack Composition

Packs should be composable.

A pack may declare dependencies:

```yaml
depends_on:
  - core
```

A scenario pack should extend Core Pack rather than duplicate it.

Example:

```text
founder-pack uses:
  core.thinking-partner
  core.decision
  core.task
  core.precedent
  core.deep-focus
  core.task-decomposition

founder-pack adds:
  founder.idea-validation
  founder.problem-hypothesis
  founder.customer-interview
  founder.mvp-scope
  founder.launch-readiness
```

### 10.1 Namespacing

All pack-defined entities should use namespaced IDs.

Examples:

```text
core.task
core.precedent
founder.mvp-scope
founder.idea-validation
software.architecture-decision
```

This avoids collisions and makes provenance clear.

### 10.2 Override Policy

Packs should not silently override Core Pack behavior.

If override is needed, it should be explicit:

```yaml
extends: core.task
overrides:
  - acceptance_criteria
  - review_policy
```

The default pattern should be extension, not replacement.

---

## 11. Extension Pack Design Contract

A well-designed Extension Pack should include:

```text
1. A purpose document
2. One or more modes
3. Scenario-specific document types
4. Scenario-specific processes
5. Tool usage policies, if the scenario changes tool behavior
6. Precedent examples
7. Templates or starter documents
8. Review criteria
```

A pack should make clear:

```text
What kind of work is this pack for?
What documents does it help produce?
What processes does it introduce?
What human judgments should be preserved?
What agent behaviors are dangerous in this domain?
What should remain under user control?
```

A pack should be readable as a method manual and executable as agent behavior.

That is the Airic design principle.

---

## 12. Founder Pack as Example

Founder Pack should not teach the kernel what a startup is.

Instead, it should define startup-specific documents and workflows on top of Core Pack.

Possible Founder Pack entities:

```text
Modes:
  founder.thinking-partner
  founder.operator
  founder.strategy-reviewer

Document Types:
  founder.problem-hypothesis
  founder.customer-interview
  founder.competitive-landscape
  founder.mvp-scope
  founder.launch-plan
  founder.gtm-plan
  founder.investor-memo

Processes:
  founder.idea-validation
  founder.customer-discovery
  founder.mvp-definition
  founder.launch-readiness-review
  founder.gtm-system-design

Precedents:
  founder.do-not-build-before-validation
  founder.prototype-is-not-validation
  founder.early-traction-is-not-pmf
  founder.keep-founder-judgment-on-strategy
```

Founder Pack uses Core Pack for:

```text
deep focus
decision capture
task decomposition
document review
tool policy
precedent extraction
session reflection
```

Founder Pack adds startup-specific judgment.

---

## 13. Architectural Invariants

Airic should preserve these invariants:

```text
1. Agent behavior is exposed as editable Markdown documents.
2. Kernel owns mechanism, not methodology.
3. Core Pack defines general agent operating logic.
4. Extension Packs define scenario-specific behavior.
5. User workspace remains user-owned.
6. Pack specs are Markdown prose with minimal frontmatter.
7. Tool implementation and tool policy are separate.
8. Process method belongs in documents; process lifecycle belongs in kernel.
9. Document type defines artifact quality; process defines workflow.
10. Context is assembled from active state and cursor path, not flat history.
11. User documents only become typed when they explicitly declare doc_type.
12. Behavior changes should be inspectable as document diffs.
13. Packs should be composable, forkable, and user-editable.
```

---

## 14. One-line Summary

Airic Kernel is the runtime substrate; Core Pack is the default document-defined agent operating system; Extension Packs are scenario-specific operating models built on top of Core Pack; and the agent’s behavior logic remains visible and editable as ordinary Markdown files in the user’s workspace.
