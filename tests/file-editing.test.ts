import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { RuntimeContextBuilder } from "../src/application/services/runtime-context-builder.js";
import { OpenDocumentUseCase, ProposeFileEditUseCase, ApplyFileEditUseCase } from "../src/application/use-cases/file-editing.js";
import { EditStore } from "../src/application/services/edit-store.js";
import { EditLog } from "../src/application/services/edit-log.js";
import { DiffService } from "../src/infrastructure/diff/diff-service.js";
import { NodeFileSystem } from "../src/infrastructure/fs/node-file-system.js";
import { bootstrapWorkspace } from "../src/application/use-cases/bootstrap-workspace.js";
import { YamlConfigLoader } from "../src/infrastructure/config/yaml-config-loader.js";
import { WorkspaceRuntimeLoader } from "../src/application/services/workspace-runtime-loader.js";
import { createSession } from "../src/domain/session/session.js";
import { JsonSessionStore } from "../src/infrastructure/store/json-session-store.js";
import type { SpecDocument } from "../src/domain/spec/spec-document.js";

describe("Step 2 file editing", () => {
  it("loads document-type spec when current document declares doc_type", async () => {
    const builder = new RuntimeContextBuilder();
    const roleSpec: SpecDocument = {
      path: "role.md",
      frontmatter: {},
      id: "core.thinking-partner",
      docType: "core.role",
      body: "Role body",
    };
    const documentTypeSpec: SpecDocument = {
      path: "decision.md",
      frontmatter: {},
      id: "core.decision",
      docType: "core.document-type",
      body: "Decision standards",
    };

    const prompt = builder.buildSystemPrompt({
      baseInstruction: "Base",
      roleSpec,
      currentDocument: {
        path: "/tmp/docs/decision.md",
        relativePath: "docs/decision.md",
        content: "---\ndoc_type: core.decision\n---\n# Decision",
        docType: "core.decision",
        documentTypeSpec,
      },
    });

    expect(prompt).toContain("Decision standards");
    expect(prompt).toContain("doc_type: core.decision");
  });

  it("proposes and applies an edit with audit log", async () => {
    const fs = new NodeFileSystem();
    const workspaceRoot = await mkdtemp(join(tmpdir(), "airic-edit-"));
    await bootstrapWorkspace(fs, workspaceRoot);

    const readmePath = join(workspaceRoot, "README.md");
    await writeFile(readmePath, "# Hello\n", "utf8");

    const sessionStore = new JsonSessionStore(fs, workspaceRoot);
    const session = createSession("s1", workspaceRoot, "core.thinking-partner");
    await sessionStore.save(session);

    const editStore = new EditStore();
    const diffService = new DiffService();
    const editLog = new EditLog(fs, workspaceRoot);

    const propose = new ProposeFileEditUseCase({
      fs,
      sessionStore,
      diffService,
      editStore,
    });
    const apply = new ApplyFileEditUseCase({
      fs,
      sessionStore,
      editStore,
      editLog,
    });

    const edit = await propose.execute({
      sessionId: "s1",
      path: "README.md",
      newContent: "# Hello World\n",
    });

    expect(edit.diff).toContain("Hello World");

    await apply.execute("s1", edit.id);
    await expect(readFile(readmePath, "utf8")).resolves.toBe("# Hello World\n");

    const logPath = join(workspaceRoot, ".airic", "logs", "edits.log");
    const log = await readFile(logPath, "utf8");
    expect(log).toContain("README.md");
  });

  it("opens a typed document and resolves document-type spec", async () => {
    const fs = new NodeFileSystem();
    const workspaceRoot = await mkdtemp(join(tmpdir(), "airic-open-"));
    await bootstrapWorkspace(fs, workspaceRoot);

    const docPath = join(workspaceRoot, "docs", "decisions", "sample.md");
    await mkdir(join(workspaceRoot, "docs", "decisions"), { recursive: true });
    await writeFile(
      docPath,
      "---\ndoc_type: core.decision\ntitle: Sample\n---\n# Sample\n",
      "utf8",
    );

    const configLoader = new YamlConfigLoader(fs);
    const runtime = await new WorkspaceRuntimeLoader(fs, configLoader).load(
      workspaceRoot,
    );
    const sessionStore = new JsonSessionStore(fs, workspaceRoot);
    const session = createSession("s1", workspaceRoot, "core.thinking-partner");
    await sessionStore.save(session);

    const openDocument = new OpenDocumentUseCase({
      fs,
      sessionStore,
      runtime,
    });

    const result = await openDocument.execute(
      "s1",
      "docs/decisions/sample.md",
    );

    expect(result.docType).toBe("core.decision");
    expect(result.documentTypeSpec?.id).toBe("core.decision");

    const saved = await sessionStore.get("s1");
    expect(saved?.currentDocument).toContain("docs/decisions/sample.md");
  });
});
