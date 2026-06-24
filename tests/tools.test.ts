import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  applyEditsToNormalizedContent,
  generateDiffString,
  generateUnifiedPatch,
  normalizeToLF,
} from "../src/infrastructure/tools/common/edit-diff.js";
import { resetFileMutationQueuesForTests } from "../src/infrastructure/tools/common/file-mutation-queue.js";
import { truncateHead } from "../src/infrastructure/tools/common/truncate.js";
import { executeReadTool } from "../src/infrastructure/tools/file/read-tool.js";
import { executeLsTool } from "../src/infrastructure/tools/file/ls-tool.js";
import { executeFindTool } from "../src/infrastructure/tools/file/find-tool.js";
import { executeGrepTool } from "../src/infrastructure/tools/file/grep-tool.js";
import {
  applyEditWrite,
  executeEditTool,
} from "../src/infrastructure/tools/file/edit-tool.js";
import {
  applyWrite,
  executeWriteTool,
} from "../src/infrastructure/tools/file/write-tool.js";
import { executeBashTool } from "../src/infrastructure/tools/shell/bash-tool.js";
import { mapToolResultToAcpContent } from "../src/interfaces/acp/acp-tool-event-mapper.js";
import { AiricToolExecutor } from "../src/application/services/airic-tool-executor.js";
import { EditStore } from "../src/application/services/edit-store.js";
import { EditLog } from "../src/application/services/edit-log.js";
import { DiffService } from "../src/infrastructure/diff/diff-service.js";
import { NodeFileSystem } from "../src/infrastructure/fs/node-file-system.js";
import { JsonSessionStore } from "../src/infrastructure/store/json-session-store.js";
import { createSession } from "../src/domain/session/session.js";
import { KERNEL_TOOL_NAMES } from "../src/domain/tool/tool-names.js";

describe("edit-diff", () => {
  it("applies a single replacement", () => {
    const content = normalizeToLF("hello world\n");
    const { newContent } = applyEditsToNormalizedContent(
      content,
      [{ oldText: "world", newText: "Airic" }],
      "test.txt",
    );
    expect(newContent).toBe("hello Airic\n");
  });

  it("rejects duplicate oldText", () => {
    const content = normalizeToLF("foo foo\n");
    expect(() =>
      applyEditsToNormalizedContent(
        content,
        [{ oldText: "foo", newText: "bar" }],
        "test.txt",
      ),
    ).toThrow(/unique/i);
  });

  it("rejects overlapping edits", () => {
    const content = normalizeToLF("abcdef\n");
    expect(() =>
      applyEditsToNormalizedContent(
        content,
        [
          { oldText: "abc", newText: "1" },
          { oldText: "bcd", newText: "2" },
        ],
        "test.txt",
      ),
    ).toThrow(/overlap/i);
  });

  it("generates unified patch", () => {
    const patch = generateUnifiedPatch("file.ts", "a\n", "b\n");
    expect(patch).toContain("file.ts");
  });

  it("generates display diff with firstChangedLine", () => {
    const { diff, firstChangedLine } = generateDiffString("a\nb\n", "a\nB\n");
    expect(diff).toContain("+2");
    expect(firstChangedLine).toBe(2);
  });
});

describe("read tool", () => {
  it("reads file with offset and limit", async () => {
    const root = await mkdtemp(join(tmpdir(), "airic-read-"));
    const filePath = join(root, "sample.txt");
    await writeFile(filePath, "line1\nline2\nline3\n", "utf8");

    const result = await executeReadTool(
      { path: "sample.txt", offset: 2, limit: 1 },
      { cwd: root, sessionId: "s1" },
    );

    expect((result.content[0] as { text: string }).text).toContain("line2");
  });

  it("truncates large output", async () => {
    const root = await mkdtemp(join(tmpdir(), "airic-read-large-"));
    const lines = Array.from({ length: 3000 }, (_, i) => `line ${i + 1}`).join("\n");
    await writeFile(join(root, "big.txt"), lines, "utf8");

    const result = await executeReadTool(
      { path: "big.txt" },
      { cwd: root, sessionId: "s1" },
    );

    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("Use offset=");
    expect(result.details?.truncation).toBeDefined();
  });
});

describe("ls tool", () => {
  it("lists directory entries with trailing slash for dirs", async () => {
    const root = await mkdtemp(join(tmpdir(), "airic-ls-"));
    await mkdir(join(root, "src"));
    await writeFile(join(root, "README.md"), "# Hi", "utf8");

    const result = await executeLsTool({}, { cwd: root, sessionId: "s1" });
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("src/");
    expect(text).toContain("README.md");
  });
});

describe("find tool", () => {
  it("finds files by glob with node fallback", async () => {
    const root = await mkdtemp(join(tmpdir(), "airic-find-"));
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(join(root, "src", "app.ts"), "export {}", "utf8");
    await writeFile(join(root, "README.md"), "# Hi", "utf8");

    const result = await executeFindTool(
      { pattern: "*.ts", path: "src" },
      { cwd: root, sessionId: "s1" },
    );

    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("app.ts");
  });
});

describe("grep tool", () => {
  it("finds matches with line numbers via node fallback", async () => {
    const root = await mkdtemp(join(tmpdir(), "airic-grep-"));
    await writeFile(join(root, "sample.ts"), "const answer = 42;\n", "utf8");

    const result = await executeGrepTool(
      { pattern: "answer", literal: true },
      { cwd: root, sessionId: "s1" },
    );

    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("sample.ts:1:");
    expect(text).toContain("answer");
  });
});

describe("edit tool", () => {
  it("applies edit and emits diff content", async () => {
    resetFileMutationQueuesForTests();
    const root = await mkdtemp(join(tmpdir(), "airic-edit-"));
    const filePath = join(root, "file.txt");
    await writeFile(filePath, "hello world\n", "utf8");

    const result = await executeEditTool(
      {
        path: "file.txt",
        edits: [{ oldText: "world", newText: "Airic" }],
      },
      { cwd: root, sessionId: "s1" },
    );

    expect(result.content.some((part) => part.type === "diff")).toBe(true);
    await applyEditWrite(result, filePath);
    await expect(readFile(filePath, "utf8")).resolves.toBe("hello Airic\n");
  });
});

describe("write tool", () => {
  it("creates file with parent directories and diff content", async () => {
    resetFileMutationQueuesForTests();
    const root = await mkdtemp(join(tmpdir(), "airic-write-"));

    const result = await executeWriteTool(
      { path: "nested/new.txt", content: "hello\n" },
      { cwd: root, sessionId: "s1" },
    );

    const diff = result.content.find((part) => part.type === "diff");
    expect(diff).toMatchObject({ oldText: null, newText: "hello\n" });

    await applyWrite(result, join(root, "nested/new.txt"));
    await expect(readFile(join(root, "nested/new.txt"), "utf8")).resolves.toBe("hello\n");
  });
});

describe("bash tool", () => {
  it("runs command and captures stdout", async () => {
    const root = await mkdtemp(join(tmpdir(), "airic-bash-"));

    const result = await executeBashTool(
      { command: "echo hello" },
      { cwd: root, sessionId: "s1" },
    );

    expect((result.content[0] as { text: string }).text).toContain("hello");
  });

  it("reports non-zero exit as error", async () => {
    const root = await mkdtemp(join(tmpdir(), "airic-bash-fail-"));

    await expect(
      executeBashTool({ command: "exit 7" }, { cwd: root, sessionId: "s1" }),
    ).rejects.toThrow(/exited with code 7/);
  });
});

describe("truncate", () => {
  it("truncates by line limit", () => {
    const content = Array.from({ length: 3000 }, (_, i) => `line ${i}`).join("\n");
    const result = truncateHead(content, { maxLines: 10, maxBytes: 1024 * 1024 });
    expect(result.truncated).toBe(true);
    expect(result.outputLines).toBe(10);
  });
});

describe("ACP mapper", () => {
  it("maps diff content for edit/write results", () => {
    const mapped = mapToolResultToAcpContent({
      content: [
        {
          type: "diff",
          path: "/tmp/a.txt",
          oldText: "a",
          newText: "b",
        },
        { type: "text", text: "done" },
      ],
    });

    expect(mapped[0]).toMatchObject({
      type: "diff",
      path: "/tmp/a.txt",
      oldText: "a",
      newText: "b",
    });
  });
});

describe("AiricToolExecutor policy", () => {
  it("invokes tool policy for bash", async () => {
    const root = await mkdtemp(join(tmpdir(), "airic-policy-"));
    const fs = new NodeFileSystem();
    const sessionStore = new JsonSessionStore(fs, root);
    const session = createSession("s1", root, "core.thinking-partner");
    await sessionStore.save(session);

    let policyChecked = false;
    const executor = new AiricToolExecutor({
      fs,
      sessionStore,
      diffService: new DiffService(),
      editStore: new EditStore(),
      editLog: new EditLog(fs, root),
      toolPolicy: {
        async check(call) {
          if (call.toolName === KERNEL_TOOL_NAMES.BASH) {
            policyChecked = true;
          }
          return { kind: "allow" };
        },
      },
    });

    await executor.execute(
      session,
      KERNEL_TOOL_NAMES.BASH,
      { command: "echo ok" },
      { toolCallId: "t1" },
    );

    expect(policyChecked).toBe(true);
  });
});
