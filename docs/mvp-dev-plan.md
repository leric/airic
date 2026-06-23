# Airic MVP Development Plan

## 1. Goal

Build the first usable Airic Kernel MVP as a Clean Architecture monolith with ACP as the first interaction surface.

The MVP should validate two core ideas:

1. Agent behavior can be configured by ordinary markdown specs.
2. Document editing standards can be configured by `doc_type`-based markdown document-type specs.

The MVP does not need a CLI chat interface. The first usable interface should be ACP, so Airic can run directly inside an agent-capable editor.

---

## 2. Development Strategy

Use a two-step plan:

```text
Step 1: ACP Chat Agent
Step 2: File Tools + doc_type-aware Editing
```

Because the project will be developed with Coding Agent assistance, we should avoid unnecessary intermediate layers. The CLI chat path is skipped. ACP is treated as the first client.

However, ACP must remain an adapter layer, not part of the kernel itself.

```text
Airic Kernel = runtime / specs / sessions / tools
ACP Adapter  = protocol interface
```

The kernel should remain UI-agnostic, so future Web UI, CLI, or other clients can reuse it.

---

## 3. Architecture Style

Use a Clean Architecture monolith.

The project is one repository and one deployable application, but code is separated by architectural boundary.

```text
airic/
  src/
    domain/
    application/
    infrastructure/
    interfaces/

  .airic/
    config.yml
    packs/
    specs/
    sessions/
    logs/
    cache/

  docs/
    design/
    development/
    decisions/

  package.json
  tsconfig.json
```

This gives fast MVP development while keeping the codebase clean enough to split later if necessary.

---

## 4. Source Layout

Recommended structure:

```text
src/
  domain/
    session/
      session.ts
    spec/
      spec-document.ts
      spec-id.ts
    document/
      markdown-document.ts
      document-type.ts
    tool/
      tool-call.ts
      tool-result.ts

  application/
    use-cases/
      bootstrap-workspace.ts
      send-message.ts
      open-document.ts
      propose-file-edit.ts
      apply-file-edit.ts

    ports/
      llm-port.ts
      file-system-port.ts
      session-store-port.ts

    services/
      spec-registry.ts
      runtime-context-builder.ts
      document-loader.ts

  infrastructure/
    llm/
      openai-llm.ts

    fs/
      node-file-system.ts

    store/
      json-session-store.ts

    markdown/
      frontmatter-parser.ts
      markdown-loader.ts

    diff/
      diff-service.ts

  interfaces/
    acp/
      acp-server.ts
      acp-adapter.ts
      acp-message-mapper.ts

  main.ts
```

### Boundary Rules

```text
domain/
  Pure model. No ACP, no OpenAI, no Node fs details.

application/
  Use case orchestration. Depends on ports, not implementations.

infrastructure/
  Concrete implementations: LLM, filesystem, session storage, markdown parsing, diff generation.

interfaces/acp/
  Protocol adapter. Converts ACP messages into application use-case calls.
```

---

## 5. Dogfood `.airic`

Airic should use its own `.airic` directory during development.

```text
.airic/
  config.yml

  packs/
    core/
      base-instruction.md
      roles/
        thinking-partner.md
      document-types/
        decision.md
        task.md
        note.md
      processes/
        precedent-extraction.md

  specs/
    roles/
      thinking-partner.md

    document-types/
      decision.md
      task.md
      note.md

    processes/
      precedent-extraction.md

  sessions/
  logs/
  cache/
```

For MVP, `.airic/packs/core` can be treated as the canonical source of the core pack inside the Airic repository.

During bootstrap, the active specs under `.airic/specs` can be copied or synchronized from `.airic/packs/core`.

Later, if Airic needs to publish packs independently, `.airic/packs/core` can be extracted into package assets.

---

## 6. Project Documents Stay Outside `.airic`

`.airic` stores agent behavior documents and runtime state.

Project documents should stay in the normal workspace where the user can see and manage them.

Example:

```text
docs/
  design/
    kernel-tdd.md

  development/
    airic-mvp-development-plan.md

  decisions/
    use-acp-first.md
    use-clean-architecture-monolith.md
```

This keeps the core invariant clear:

```text
User workspace is owned by the user.
Airic only owns .airic.
```

---

## 7. Step 1: ACP Chat Agent

### Goal

Implement the smallest usable ACP-based Airic agent that can chat with the user and load its behavior from markdown role specs.

No file editing in this step.

### Scope

Implement:

```text
- Clean Architecture monolith skeleton
- .airic bootstrap
- config loader
- core pack files
- markdown spec loader
- role spec registry
- session store
- runtime context builder
- LLM port and implementation
- ACP adapter
- sendMessage use case
```

### Runtime Context

For Step 1, each message uses:

```text
kernel base instruction
+ active role spec
+ chat history
```

### Required Files

```text
.airic/config.yml
.airic/packs/core/base-instruction.md
.airic/specs/roles/thinking-partner.md
```

Minimal config:

```yaml
default_role: core.thinking-partner

spec_paths:
  roles: .airic/specs/roles
  document_types: .airic/specs/document-types
  processes: .airic/specs/processes

editing:
  require_confirmation: true
```

Minimal role spec:

```markdown
---
id: core.thinking-partner
doc_type: core.role
title: Thinking Partner
---

# Thinking Partner

Your job is to help the user think clearly without taking over direction.

## Principles

- Protect the user's deep thinking.
- Ask high-leverage questions only when useful.
- Do not force premature summaries.
- Separate discussion, decision, task, and review.
- Preserve unresolved ideas when they may matter later.
```

### Key Types

```ts
export type MarkdownDocument = {
  path: string
  frontmatter: Record<string, unknown>
  body: string
}

export type SpecDocument = MarkdownDocument & {
  id: string
  docType: 'core.role' | 'core.document-type' | 'core.process'
}

export type Session = {
  id: string
  roleId?: string
  currentDocument?: string
  activeProcess?: string
  messages: ChatMessage[]
}
```

### Main Use Case

```ts
sendMessage(sessionId, userMessage)
```

Responsibilities:

```text
1. Load session.
2. Load config.
3. Resolve active role spec.
4. Build runtime context.
5. Call LLM.
6. Stream response through ACP.
7. Save updated session.
```

### Acceptance Criteria

Step 1 is done when:

```text
1. Airic can start as an ACP agent.
2. User can chat with Airic through an ACP client.
3. Airic loads .airic/specs/roles/thinking-partner.md.
4. Modifying thinking-partner.md changes the agent behavior after session restart or reload.
5. No file tools are required yet.
```

The key validation is:

```text
Agent behavior is markdown-defined.
```

---

## 8. Step 2: File Tools + doc_type-aware Editing

### Goal

Add file reading, file creation, reviewable file editing, current document state, and `doc_type`-based document-type aware editing.

### Scope

Implement:

```text
- list_files
- read_file
- create_file
- propose_edit
- apply_edit
- current_document session state
- markdown frontmatter parsing for user documents
- document-type spec resolution
- diff-first editing flow
- edits.log
```

Optional:

```text
- search_text
```

### File Tools

Initial tool set:

```text
list_files(path)
read_file(path)
create_file(path, content)
propose_edit(path, patch)
apply_edit(edit_id)
search_text(query)
```

The agent should not directly mutate files.

The preferred flow is:

```text
agent proposes edit
→ kernel generates diff
→ ACP UI shows diff
→ user accepts or rejects
→ kernel applies accepted edit
→ edit is logged
```

### Current Document

The session can optionally have:

```ts
currentDocument?: string
```

This is set when:

```text
- User opens a file through the ACP client.
- User asks Airic to open a file.
- User asks Airic to create a document and continue editing it.
```

### Runtime Context

If no current document:

```text
base instruction
+ active role spec
+ chat history
```

If current document exists but has no `doc_type`:

```text
base instruction
+ active role spec
+ current file content
+ chat history
```

If current document declares `doc_type`:

```text
base instruction
+ active role spec
+ current document content
+ resolved document-type spec
+ chat history
```

If an active process exists later:

```text
+ active process spec
```

Process activation is not required in Step 2.

---

## 9. Document-Type Aware Editing

A user markdown document only enters document-type aware editing when it explicitly declares `doc_type` in frontmatter.

Example:

```markdown
---
doc_type: core.decision
title: Use ACP first
status: draft
---

# Use ACP first

## Context

...

## Decision

...
```

The kernel resolves:

```text
doc_type: core.decision
→ .airic/specs/document-types/decision.md
```

Document-type spec example:

```markdown
---
id: core.decision
doc_type: core.document-type
title: Decision Document
---

# Decision Document

A decision document records a stable decision that should guide future work.

A good decision document should make clear:

- What was decided.
- Why it was decided.
- What alternatives were considered.
- What constraints or consequences follow from the decision.
- What questions remain open.
```

### Invariant

Airic never infers persistent document semantics for user files.

A user file enters document-type aware editing only when it explicitly declares `doc_type` in frontmatter.

---

## 10. Step 2 Acceptance Criteria

Step 2 is done when:

### Case 1: Plain File Editing

```text
Given:
  README.md without frontmatter doc_type

When:
  User opens README.md and asks Airic to edit it

Then:
  Airic reads the file
  Airic proposes a diff
  User can accept the diff
  File is updated
  No document-type spec is loaded
```

### Case 2: Document-Type Aware Editing

```text
Given:
  docs/decisions/use-acp-first.md

With:
  ---
  doc_type: core.decision
  ---

When:
  User opens the document

Then:
  Airic loads core.decision document-type spec
  Airic can review and edit the document according to decision document standards
```

### Case 3: Create Typed Document

```text
When:
  User asks Airic to create a new decision document

Then:
  Airic creates a markdown file in user workspace
  The file includes doc_type frontmatter
  The session sets current_document to the new file
  Airic enters document-type aware editing mode
```

### Case 4: Audit Trail

```text
When:
  User accepts an edit

Then:
  Airic writes the file
  Airic appends a record to .airic/logs/edits.log
```

The key validation is:

```text
Document editing standards are markdown-defined.
```

---

## 11. Explicit Non-goals for the Two-Step MVP

Do not implement yet:

```text
- CLI chat
- Semantic links
- Overlay metadata
- Resource identity tracking
- File move / rename synchronization
- Persistent document graph
- Background agents
- Decision Queue
- Review agent
- Process state machine
- Pack marketplace
- Multi-agent execution
- Web UI
```

Process specs may exist in the core pack, but the runtime does not need process activation until after Step 2.

---

## 12. Coding Agent Task Breakdown

### Step 1A: Project Skeleton

Create:

```text
src/domain
src/application
src/infrastructure
src/interfaces/acp
.airic
docs
```

Set up:

```text
package.json
tsconfig.json
lint/test config
```

### Step 1B: `.airic` Bootstrap

Implement:

```text
bootstrapWorkspace()
```

It should:

```text
- create .airic if missing
- create config.yml if missing
- install core role specs
- install core document-type specs
- install core process specs
```

### Step 1C: Spec Loader

Implement:

```text
loadMarkdownDocument(path)
loadSpecDocuments(specPath)
SpecRegistry
```

Support:

```text
core.role
core.document-type
core.process
```

### Step 1D: Session Runtime

Implement:

```text
JsonSessionStore
RuntimeContextBuilder
sendMessage()
```

### Step 1E: ACP Adapter

Implement:

```text
ACP server entry
message mapping
response streaming
session creation
```

### Step 1F: Manual Verification

Verify:

```text
- ACP chat works
- thinking-partner.md is loaded
- modifying thinking-partner.md changes behavior
```

---

### Step 2A: File System Port

Implement:

```text
FileSystemPort
NodeFileSystem
list_files
read_file
create_file
```

### Step 2B: Current Document

Implement:

```text
openDocument(sessionId, path)
currentDocument in Session
```

### Step 2C: Frontmatter and doc_type

Implement:

```text
parseMarkdownFrontmatter()
resolveDocumentTypeSpec(docType)
```

### Step 2D: Diff-first Editing

Implement:

```text
proposeFileEdit()
applyFileEdit()
DiffService
edits.log
```

### Step 2E: ACP Edit Flow

Wire edit proposal into ACP:

```text
agent proposes edit
→ ACP displays diff
→ user accepts
→ apply edit
```

### Step 2F: Manual Verification

Verify:

```text
- Plain README edit
- doc_type-aware decision document edit
- typed document creation
- edit log
```

---

## 13. Dogfood Documents

Create the first Airic project documents in the normal workspace:

```text
docs/design/kernel-tdd.md
docs/development/airic-mvp-development-plan.md
docs/decisions/use-acp-first.md
docs/decisions/use-clean-architecture-monolith.md
```

Suggested frontmatter for decisions:

```markdown
---
doc_type: core.decision
title: Use ACP first
status: accepted
---
```

Suggested frontmatter for this plan:

```markdown
---
doc_type: core.note
title: Airic MVP Development Plan
status: draft
---
```

These documents should be edited by Airic itself once Step 2 works.

---

## 14. Success Definition

The two-step MVP is successful when Airic can dogfood its own development workspace:

```text
1. Airic runs as an ACP agent.
2. Airic behavior is controlled by .airic/specs/roles/thinking-partner.md.
3. Airic can open and edit files in the repository.
4. Airic can create and edit markdown documents with doc_type frontmatter.
5. Airic can use document-type specs to improve project documents.
6. All project documents remain ordinary files under docs/.
7. Removing .airic removes the agent layer but does not destroy project files.
```

At that point, Airic has proven its MVP kernel:

```text
markdown-configured agent
+ ACP interaction
+ workspace file editing
+ explicit doc_type-based document collaboration
```
