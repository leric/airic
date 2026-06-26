import { join } from "node:path";
import type { FileSystemPort } from "../ports/file-system-port.js";

const DEFAULT_CONFIG = `default_mode: core.thinking-partner

llm:
  provider: openai
  model: gpt-4o
  temperature: 0.7
  max_tokens: 4096

packs:
  core: .airic/packs/core

spec_paths:
  modes: .airic/specs/modes
  document_types: .airic/specs/document-types
  processes: .airic/specs/processes

editing:
  require_confirmation: true

cache:
  enabled: true
`;

const BASE_INSTRUCTION = `---
id: core.base-instruction
doc_type: core.process
title: Airic Base Instruction
---

# Airic Kernel

You are Airic, a markdown-configured agent running over a user-owned workspace.

## Core Rules

- The user workspace belongs to the user. You only own \`.airic/\`.
- Follow the active mode spec for behavior and tone.
- Be concise unless the user asks for depth.
- Do not claim to have edited files unless a tool or confirmed edit actually ran.
- Use read, ls, find, and grep to explore the workspace before editing.
- Use edit for precise changes with oldText/newText replacements.
- Use write only for new files or complete rewrites.
`;

const THINKING_PARTNER = `---
id: core.thinking-partner
doc_type: core.mode
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
`;

const MODE_SPEC_DEFINITION = `---
id: core.mode
doc_type: core.mode
title: Mode Spec
---

# Mode Spec

A mode spec defines the agent's thinking style and behavior for a session.

Every active session loads exactly one mode spec. The mode is referenced by its \`id\` (for example \`core.thinking-partner\`).

## Frontmatter

- \`id\`: unique mode identifier
- \`doc_type\`: must be \`core.mode\`
- \`title\`: human-readable name

## Body

Describe how the agent should behave: tone, priorities, boundaries, and what it should avoid.

Concrete mode instances (such as thinking-partner) live under \`packs/core/modes/\` and are activated via \`.airic/specs/modes/\`.
`;

const DOCUMENT_TYPE_SPEC_DEFINITION = `---
id: core.document-type
doc_type: core.document-type
title: Document-Type Spec
---

# Document-Type Spec

A document-type spec describes what a good user document of that type should contain.

Document-type specs are resolved when a user markdown file explicitly declares \`doc_type\` in frontmatter (for example \`doc_type: core.decision\`).

## Frontmatter

- \`id\`: unique document-type identifier (for example \`core.decision\`)
- \`doc_type\`: must be \`core.document-type\`
- \`title\`: human-readable name

## Body

Describe the purpose, expected sections, quality bar, and review criteria for documents of this type.

Concrete document-type instances (such as decision or note) are installed under \`.airic/specs/document-types/\`, not in the core pack.
`;

const PROCESS_SPEC_DEFINITION = `---
id: core.process
doc_type: core.process
title: Process Spec
---

# Process Spec

A process spec describes a repeatable interaction flow with recognizable steps.

Processes can guide structured collaboration such as precedent extraction, discovery, or review.

## Frontmatter

- \`id\`: unique process identifier (for example \`core.precedent-extraction\`)
- \`doc_type\`: must be \`core.process\`
- \`title\`: human-readable name

## Body

Describe the steps, guidance, and stopping conditions for the process.

Concrete process instances live under \`packs/core/processes/\` and are activated via \`.airic/specs/processes/\`.
`;

const DECISION_SPEC = `---
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
`;

const TASK_SPEC = `---
id: core.task
doc_type: core.document-type
title: Task Document
---

# Task Document

A task document captures actionable work with enough context to execute later.
`;

const NOTE_SPEC = `---
id: core.note
doc_type: core.document-type
title: Note Document
---

# Note Document

A note document captures working thoughts, observations, or references without requiring a final decision.
`;

const SUMUP_SYSTEM_PROMPT = `---
id: core.sumup-system
title: Dig-in Sumup System Prompt
---

You summarize temporary dig-in conversations for Airic Kernel session history.
Produce a concise return summary that helps the user resume the main discussion.
Follow the requested structure exactly.
`;

const SUMUP_USER_PROMPT = `---
id: core.sumup-user
title: Dig-in Sumup User Prompt
---

Summarize the dig-in conversation above and prepare to return to the main discussion.

Resume point: {{resumePoint}}
Dig-in topic: {{topic}}
{{baseContext}}

Produce a return summary with exactly this structure:

Returned to: <resume point>

Before dig-in:
<what we were discussing at the resume point>

Dig-in summary:
<what the side discussion found>

Brought back:
<conclusions or constraints that should affect the resumed discussion>

Continuing:
<where the discussion should continue from>
`;

const PRECEDENT_EXTRACTION = `---
id: core.precedent-extraction
doc_type: core.process
title: Precedent Extraction
---

# Precedent Extraction

This process helps the user extract reusable patterns or precedents from past work or experiences.

## Steps

1. Identify a concrete past case or example.
2. Describe what happened in that case.
3. Analyze why it worked or failed.
4. Extract key patterns or principles.
5. Generalize the patterns into reusable guidance.
`;

type PackFile = {
  relativePath: string;
  content: string;
};

const CORE_PACK_FILES: PackFile[] = [
  { relativePath: "base-instruction.md", content: BASE_INSTRUCTION },
  { relativePath: "modes/thinking-partner.md", content: THINKING_PARTNER },
  {
    relativePath: "document-types/mode.md",
    content: MODE_SPEC_DEFINITION,
  },
  {
    relativePath: "document-types/document-type.md",
    content: DOCUMENT_TYPE_SPEC_DEFINITION,
  },
  {
    relativePath: "document-types/process.md",
    content: PROCESS_SPEC_DEFINITION,
  },
  { relativePath: "processes/precedent-extraction.md", content: PRECEDENT_EXTRACTION },
  { relativePath: "prompts/sumup-system.md", content: SUMUP_SYSTEM_PROMPT },
  { relativePath: "prompts/sumup-user.md", content: SUMUP_USER_PROMPT },
];

const DEFAULT_SPEC_FILES: PackFile[] = [
  { relativePath: "document-types/decision.md", content: DECISION_SPEC },
  { relativePath: "document-types/task.md", content: TASK_SPEC },
  { relativePath: "document-types/note.md", content: NOTE_SPEC },
];

export type BootstrapResult = {
  workspaceRoot: string;
  airicRoot: string;
  createdPaths: string[];
};

export async function bootstrapWorkspace(
  fs: FileSystemPort,
  workspaceRoot: string,
): Promise<BootstrapResult> {
  const airicRoot = join(workspaceRoot, ".airic");
  const createdPaths: string[] = [];

  const ensureDir = async (path: string) => {
    const exists = await fs.exists(path);
    if (!exists) {
      await fs.mkdir(path, true);
      createdPaths.push(path);
    }
  };

  const ensureFile = async (path: string, content: string) => {
    const exists = await fs.exists(path);
    if (!exists) {
      await fs.writeText(path, content);
      createdPaths.push(path);
    }
  };

  await ensureDir(airicRoot);
  await ensureDir(join(airicRoot, "packs", "core"));
  await ensureDir(join(airicRoot, "specs", "modes"));
  await ensureDir(join(airicRoot, "specs", "document-types"));
  await ensureDir(join(airicRoot, "specs", "processes"));
  await ensureDir(join(airicRoot, "sessions"));
  await ensureDir(join(airicRoot, "logs"));
  await ensureDir(join(airicRoot, "cache"));

  await ensureFile(join(airicRoot, "config.yml"), DEFAULT_CONFIG);

  for (const file of CORE_PACK_FILES) {
    const packPath = join(airicRoot, "packs", "core", file.relativePath);
    await ensureDir(join(packPath, ".."));
    await ensureFile(packPath, file.content);
  }

  for (const file of DEFAULT_SPEC_FILES) {
    const specPath = join(airicRoot, "specs", file.relativePath);
    await ensureDir(join(specPath, ".."));
    await ensureFile(specPath, file.content);
  }

  await syncCorePackToSpecs(fs, workspaceRoot);

  return { workspaceRoot, airicRoot, createdPaths };
}

export async function syncCorePackToSpecs(
  fs: FileSystemPort,
  workspaceRoot: string,
): Promise<void> {
  const airicRoot = join(workspaceRoot, ".airic");
  const mappings = [
    {
      from: join(airicRoot, "packs", "core", "modes"),
      to: join(airicRoot, "specs", "modes"),
    },
    {
      from: join(airicRoot, "packs", "core", "processes"),
      to: join(airicRoot, "specs", "processes"),
    },
  ];

  for (const mapping of mappings) {
    const exists = await fs.exists(mapping.from);
    if (!exists) {
      continue;
    }

    await fs.mkdir(mapping.to, true);
    const files = await fs.readDir(mapping.from);

    for (const filePath of files) {
      if (!filePath.endsWith(".md")) {
        continue;
      }
      const fileName = filePath.split("/").pop()!;
      const destination = join(mapping.to, fileName);
      const sourceExists = await fs.exists(filePath);
      const destinationExists = await fs.exists(destination);

      if (sourceExists && !destinationExists) {
        await fs.copyFile(filePath, destination);
      }
    }
  }

  const baseInstructionSource = join(
    airicRoot,
    "packs",
    "core",
    "base-instruction.md",
  );
  const baseInstructionExists = await fs.exists(baseInstructionSource);
  if (baseInstructionExists) {
    // base instruction is loaded directly from pack; no spec copy needed
  }
}
