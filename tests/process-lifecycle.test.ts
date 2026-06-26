import { describe, expect, it } from "vitest";
import {
  ProcessLifecycleError,
  cancelProcess,
  completeProcess,
  getProcessStatus,
  startProcess,
} from "../src/application/services/process-lifecycle.js";
import { SpecRegistry } from "../src/application/services/spec-registry.js";
import { createSession } from "../src/domain/session/session.js";
import type { SpecDocument } from "../src/domain/spec/spec-document.js";

function makeProcessSpec(
  id: string,
  activation: "manual" | "suggested" = "suggested",
): SpecDocument {
  return {
    path: `${id}.md`,
    frontmatter: {
      id,
      doc_type: "core.process",
      title: id,
      activation,
    },
    id,
    docType: "core.process",
    body: `# ${id}`,
  };
}

describe("process lifecycle", () => {
  it("starts, completes, and clears active process", () => {
    const registry = new SpecRegistry();
    registry.register(makeProcessSpec("core.process.task-decomposition"));
    const session = createSession("s1", "/tmp", "core.mode.thinking-partner");

    const { instance } = startProcess(session, registry, {
      processId: "core.process.task-decomposition",
      startedBy: "user",
      reason: "User requested task breakdown.",
    });

    expect(session.activeProcessInstanceId).toBe(instance.id);
    expect(getProcessStatus(session, registry).active).toBe(true);

    completeProcess(session, registry, {
      outputSummary: "Created task draft.",
    });

    expect(session.activeProcessInstanceId).toBeUndefined();
    expect(getProcessStatus(session, registry).active).toBe(false);
    expect(session.processInstances[instance.id]?.status).toBe("completed");
  });

  it("cancels active process and stores reason", () => {
    const registry = new SpecRegistry();
    registry.register(makeProcessSpec("core.process.precedent-extraction"));
    const session = createSession("s1", "/tmp", "core.mode.thinking-partner");

    const { instance } = startProcess(session, registry, {
      processId: "core.process.precedent-extraction",
      startedBy: "agent",
      reason: "Reusable judgment detected.",
    });

    cancelProcess(session, {
      reason: "Process no longer fits.",
    });

    expect(session.activeProcessInstanceId).toBeUndefined();
    expect(session.processInstances[instance.id]?.status).toBe("cancelled");
    expect(session.processInstances[instance.id]?.reason).toBe(
      "Process no longer fits.",
    );
  });

  it("rejects agent start for manual-only processes", () => {
    const registry = new SpecRegistry();
    registry.register(makeProcessSpec("core.manual-only", "manual"));
    const session = createSession("s1", "/tmp", "core.mode.thinking-partner");

    expect(() =>
      startProcess(session, registry, {
        processId: "core.manual-only",
        startedBy: "agent",
        reason: "Looks relevant.",
      }),
    ).toThrow(ProcessLifecycleError);
  });

  it("rejects starting a second process while one is active", () => {
    const registry = new SpecRegistry();
    registry.register(makeProcessSpec("core.process.task-decomposition"));
    registry.register(makeProcessSpec("core.process.precedent-extraction"));
    const session = createSession("s1", "/tmp", "core.mode.thinking-partner");

    startProcess(session, registry, {
      processId: "core.process.task-decomposition",
      startedBy: "user",
    });

    expect(() =>
      startProcess(session, registry, {
        processId: "core.process.precedent-extraction",
        startedBy: "user",
      }),
    ).toThrow(/already active/i);
  });
});
