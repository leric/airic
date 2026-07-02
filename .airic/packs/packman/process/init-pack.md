---
id: packman.process.init-pack
doc_type: core.process
title: Init Pack
summary: The entry process for building a new pack—confirm its function and goals, settle its name, plan how the methodology decomposes into modes, processes, and doctypes, then scaffold the directory, manifest, and a named, described stub (with frontmatter) for each construct.
activation: suggested
triggers:
  - A packsmith session begins with the goal of building a new pack.
  - The user wants to start a new pack.
---

### What it does

`init-pack` is the entry process for building a new pack—every such session opens with it. With the user, you confirm what the methodology is for (its function and goals), settle the pack's name, and then plan it at a high level: decide how the methodology decomposes into modes, processes, and document types, name each part, and write a brief description of what it is for. You then lay down the skeleton under `.airic/packs/<name>/`: the manifest, and a stub file for every construct carrying its frontmatter and that brief description.

Activation is `suggested` and driven by its triggers: when the session's goal is to build a new pack, the agent activates it; when the session only refines an existing pack, init-pack is skipped and work goes straight to the relevant define- *process. The activation always stays visible to the user. When it finishes, the pack exists as a well-formed map of named, described stubs—ready for the define-* processes to fill in each body.

init-pack sets up the structure and the plan; it does not write the bodies. The detailed content of each mode, process, and document type is the job of the matching define-* process.

### Steps

1. **Confirm purpose and scope.** Restate, in a sentence or two, what methodology this pack captures and what it should help the agent do, and name the scenario it targets. If purpose or scope is still vague, press the user until it is concrete.
2. **Agree on a name and id.** Choose a short, lowercase, hyphenated pack name; it is used as the directory name and as the prefix for spec ids (e.g. `<name>.mode`). Confirm the name with the user before creating anything.
3. **Decompose the methodology into constructs.** With the user, work out which parts of the methodology become modes, which become processes, and which become document types (or which standard core doctypes it reuses). This is the core of init-pack—getting the decomposition right is what makes the rest of the work coherent. Press the user wherever the split is unclear, and revise it openly rather than locking in a shaky one.
4. **Name each construct and describe it.** Give every mode, process, and doctype a precise name and a brief description of what it is for. The names become spec ids; the descriptions seed each stub and feed the mode's high-level map.
5. **Create the directory and stub files.** Under `.airic/packs/<name>/`, create the layout and, for each planned construct, a stub file carrying its frontmatter (`id`, `doc_type`, `title`, plus a `summary` for processes) and its brief description. Create only the subdirectories the pack will actually use.
6. **Write the manifest.** Fill `manifest.yaml` with `id`, `name`, `description` (the one-line intent), and `version` (start at `0.1`).
7. **Confirm and hand off.** Show the user the scaffolded map of named, described stubs, and point to the next step: running the matching define-* process to fill in each construct's body.

### Reference: scaffolded layout

```
.airic/packs/<name>/
  manifest.yaml
  modes/<id>.md            # frontmatter + brief description
  processes/<id>.md        # frontmatter + brief description
  document-types/<id>.md   # only if the pack defines its own type
```

Each stub is a small `yaml` frontmatter block—`id`, `doc_type`, `title` (and a `summary` for processes)—followed by a one-paragraph description of what the construct is for. The manifest is likewise minimal:

```yaml
# manifest.yaml
id: <pack-id>
name: <pack name>
description: <one-line intent>
version: 0.1
```

### Guidance

- Write only frontmatter and a brief description in each stub—not the body. The detailed content of each construct belongs to its define-* process.
- The decomposition is the heart of init-pack. Treat it as a real plan, not a throwaway sketch, and revise it with the user rather than committing to a shaky split.
- Get the name right before scaffolding; ids derive from it, and renaming later is costly.
- Keep the manifest minimal: it describes the pack, not its internals. The kernel discovers specs from the directories.
- A pack need not contain every construct type. Create only the subdirectories the methodology needs.
- packsmith only builds extension packs. Never scaffold into or modify the core pack or the kernel.
