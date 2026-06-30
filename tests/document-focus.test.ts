import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  clearActiveDocument,
  setActiveDocument,
} from "../src/application/services/document-focus.js";
import { SpecRegistry } from "../src/application/services/spec-registry.js";
import { createSession } from "../src/domain/session/session.js";
import { NodeFileSystem } from "../src/infrastructure/fs/node-file-system.js";
import { bootstrapWorkspace } from "../src/application/use-cases/bootstrap-workspace.js";
import { YamlConfigLoader } from "../src/infrastructure/config/yaml-config-loader.js";
import { WorkspaceRuntimeLoader } from "../src/application/services/workspace-runtime-loader.js";
import { ToolExecutor } from "../src/application/services/tool-executor.js";
import { createDefaultToolRegistry } from "../src/infrastructure/tools/create-tool-registry.js";
import { KERNEL_TOOL_NAMES } from "../src/domain/tool/tool-names.js";
import { JsonSessionStore } from "../src/infrastructure/store/json-session-store.js";
import { createTestHistoryTools } from "./test-tool-deps.js";

describe("setActiveDocument", () => {
  it("sets session.currentDocument and returns doc_type context", async () => {
    const fs = new NodeFileSystem();
    const workspaceRoot = await mkdtemp(join(tmpdir(), "airic-doc-focus-"));
    await bootstrapWorkspace(fs, workspaceRoot);

    const docPath = join(workspaceRoot, "docs", "tasks", "sample.md");
    await mkdir(join(workspaceRoot, "docs", "tasks"), { recursive: true });
    await writeFile(
      docPath,
      "---\ndoc_type: core.task\ntitle: Sample\n---\n# Sample\n",
      "utf8",
    );

    const configLoader = new YamlConfigLoader(fs);
    const runtime = await new WorkspaceRuntimeLoader(fs, configLoader).load(
      workspaceRoot,
    );
    const session = createSession("s1", workspaceRoot, "core.mode.thinking-partner");

    const result = await setActiveDocument(
      fs,
      session,
      runtime.specRegistry,
      "docs/tasks/sample.md",
    );

    expect(session.currentDocument).toContain("docs/tasks/sample.md");
    expect(result.docType).toBe("core.task");
    expect(result.documentTypeSpec?.id).toBe("core.document-type.task");
    expect(result.content).toContain("# Sample");
  });

  it("sets currentDocument without doc_type spec when frontmatter omits doc_type", async () => {
    const fs = new NodeFileSystem();
    const workspaceRoot = await mkdtemp(join(tmpdir(), "airic-doc-focus-plain-"));
    await bootstrapWorkspace(fs, workspaceRoot);

    const docPath = join(workspaceRoot, "notes.md");
    await writeFile(docPath, "# Notes\n", "utf8");

    const session = createSession("s1", workspaceRoot, "core.mode.thinking-partner");

    const result = await setActiveDocument(
      fs,
      session,
      new SpecRegistry(),
      "notes.md",
    );

    expect(session.currentDocument).toContain("notes.md");
    expect(result.docType).toBeUndefined();
    expect(result.documentTypeSpec).toBeUndefined();
  });

  it("throws when document path does not exist", async () => {
    const fs = new NodeFileSystem();
    const workspaceRoot = await mkdtemp(join(tmpdir(), "airic-doc-focus-missing-"));
    await bootstrapWorkspace(fs, workspaceRoot);
    const session = createSession("s1", workspaceRoot, "core.mode.thinking-partner");

    await expect(
      setActiveDocument(fs, session, new SpecRegistry(), "missing.md"),
    ).rejects.toThrow(/Document not found/);
  });
});

describe("clearActiveDocument", () => {
  it("clears session.currentDocument", () => {
    const session = createSession("s1", "/tmp/ws", "core.mode.thinking-partner");
    session.currentDocument = "/tmp/ws/docs/task.md";

    clearActiveDocument(session);

    expect(session.currentDocument).toBeUndefined();
  });
});

describe("document.focus tool", () => {
  it("focuses and clears via ToolExecutor", async () => {
    const fs = new NodeFileSystem();
    const workspaceRoot = await mkdtemp(join(tmpdir(), "airic-doc-focus-tool-"));
    await bootstrapWorkspace(fs, workspaceRoot);

    const docPath = join(workspaceRoot, "docs", "task.md");
    await mkdir(join(workspaceRoot, "docs"), { recursive: true });
    await writeFile(
      docPath,
      "---\ndoc_type: core.task\n---\n# Task\n",
      "utf8",
    );

    const configLoader = new YamlConfigLoader(fs);
    const runtime = await new WorkspaceRuntimeLoader(fs, configLoader).load(
      workspaceRoot,
    );
    const sessionStore = new JsonSessionStore(fs, workspaceRoot);
    const session = createSession("s1", workspaceRoot, "core.mode.thinking-partner");
    await sessionStore.save(session);

    const registry = createDefaultToolRegistry({
      fs,
      sessionStore,
      specRegistry: runtime.specRegistry,
      historyTools: createTestHistoryTools(),
    });
    const executor = new ToolExecutor({
      registry,
      mutationCoordinator: {
        confirmAndApply: async (_session, _args, result) => result,
      } as never,
    });

    const focusResult = await executor.execute(
      session,
      KERNEL_TOOL_NAMES.DOCUMENT_FOCUS,
      { path: "docs/task.md" },
      { toolCallId: "focus-1" },
    );
    expect(focusResult.details).toMatchObject({
      active: true,
      path: "docs/task.md",
      docType: "core.task",
    });

    const saved = await sessionStore.get("s1");
    expect(saved?.currentDocument).toContain("docs/task.md");

    const clearResult = await executor.execute(
      session,
      KERNEL_TOOL_NAMES.DOCUMENT_FOCUS,
      {},
      { toolCallId: "focus-2" },
    );
    expect(clearResult.details).toEqual({ active: false });

    const cleared = await sessionStore.get("s1");
    expect(cleared?.currentDocument).toBeUndefined();
  });
});
