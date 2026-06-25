import { randomUUID } from "node:crypto";
import type { Session, ProcessInstance } from "../../domain/session/session.js";
import type { SpecDocument } from "../../domain/spec/spec-document.js";
import type { SpecRegistry } from "./spec-registry.js";
import type { ProcessActivation } from "./process-catalog.js";

export type ProcessStarter = "user" | "agent";

export type StartProcessInput = {
  processId: string;
  startedBy: ProcessStarter;
  reason?: string;
  inputSummary?: string;
};

export type StartProcessResult = {
  instance: ProcessInstance;
  spec: SpecDocument;
};

export type CompleteProcessInput = {
  processInstanceId?: string;
  outputSummary: string;
};

export type CancelProcessInput = {
  processInstanceId?: string;
  reason: string;
};

export type ProcessStatusResult = {
  active: boolean;
  activeProcess?: {
    processInstanceId: string;
    processId: string;
    title: string;
    startedBy: ProcessStarter;
    startedAt: string;
    reason?: string;
    inputSummary?: string;
  };
};

export class ProcessLifecycleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProcessLifecycleError";
  }
}

export function getActiveProcessInstance(
  session: Session,
): ProcessInstance | undefined {
  if (!session.activeProcessInstanceId) {
    return undefined;
  }
  return session.processInstances[session.activeProcessInstanceId];
}

export function startProcess(
  session: Session,
  specRegistry: SpecRegistry,
  input: StartProcessInput,
): StartProcessResult {
  const spec = specRegistry.get(input.processId);
  if (!spec || spec.docType !== "core.process") {
    throw new ProcessLifecycleError(`Process not found: ${input.processId}`);
  }

  const activation = readActivation(spec.frontmatter.activation);
  if (input.startedBy === "agent" && activation === "manual") {
    throw new ProcessLifecycleError(
      `Process ${input.processId} requires manual user activation.`,
    );
  }

  const active = getActiveProcessInstance(session);
  if (active) {
    throw new ProcessLifecycleError(
      `A process is already active: ${active.processId}. Complete or cancel it first.`,
    );
  }

  const now = new Date().toISOString();
  const instance: ProcessInstance = {
    id: randomUUID(),
    processId: input.processId,
    status: "active",
    startedBy: input.startedBy,
    startedAt: now,
    reason: input.reason,
    inputSummary: input.inputSummary,
  };

  session.processInstances[instance.id] = instance;
  session.activeProcessInstanceId = instance.id;
  session.updatedAt = now;

  return { instance, spec };
}

export function completeProcess(
  session: Session,
  specRegistry: SpecRegistry,
  input: CompleteProcessInput,
): ProcessInstance {
  const instance = resolveTargetInstance(session, input.processInstanceId);
  if (!instance) {
    throw new ProcessLifecycleError("No active process to complete.");
  }

  const now = new Date().toISOString();
  instance.status = "completed";
  instance.completedAt = now;
  instance.outputSummary = input.outputSummary;
  session.activeProcessInstanceId = undefined;
  session.updatedAt = now;

  specRegistry.get(instance.processId);
  return instance;
}

export function cancelProcess(
  session: Session,
  input: CancelProcessInput,
): ProcessInstance {
  const instance = resolveTargetInstance(session, input.processInstanceId);
  if (!instance) {
    throw new ProcessLifecycleError("No active process to cancel.");
  }

  const now = new Date().toISOString();
  instance.status = "cancelled";
  instance.cancelledAt = now;
  instance.reason = input.reason;
  session.activeProcessInstanceId = undefined;
  session.updatedAt = now;

  return instance;
}

export function getProcessStatus(
  session: Session,
  specRegistry: SpecRegistry,
): ProcessStatusResult {
  const instance = getActiveProcessInstance(session);
  if (!instance) {
    return { active: false };
  }

  const spec = specRegistry.get(instance.processId);
  const title =
    typeof spec?.frontmatter.title === "string"
      ? spec.frontmatter.title
      : instance.processId;

  return {
    active: true,
    activeProcess: {
      processInstanceId: instance.id,
      processId: instance.processId,
      title,
      startedBy: instance.startedBy,
      startedAt: instance.startedAt,
      reason: instance.reason,
      inputSummary: instance.inputSummary,
    },
  };
}

export function formatProcessStatusForUser(
  status: ProcessStatusResult,
): string {
  if (!status.active || !status.activeProcess) {
    return "No active process.";
  }

  const lines = [
    `Active process: ${status.activeProcess.processId}`,
    `Started by: ${status.activeProcess.startedBy}`,
  ];

  if (status.activeProcess.reason) {
    lines.push(`Reason: ${status.activeProcess.reason}`);
  }
  if (status.activeProcess.inputSummary) {
    lines.push(`Input: ${status.activeProcess.inputSummary}`);
  }

  return lines.join("\n");
}

export function mergeProcessState(
  target: Session,
  source: Session,
): void {
  target.activeProcessInstanceId = source.activeProcessInstanceId;
  target.processInstances = source.processInstances;
}

function resolveTargetInstance(
  session: Session,
  processInstanceId?: string,
): ProcessInstance | undefined {
  if (processInstanceId) {
    const instance = session.processInstances[processInstanceId];
    if (!instance || instance.status !== "active") {
      throw new ProcessLifecycleError(
        `Active process instance not found: ${processInstanceId}`,
      );
    }
    return instance;
  }

  return getActiveProcessInstance(session);
}

function readActivation(value: unknown): ProcessActivation {
  if (value === "manual" || value === "suggested") {
    return value;
  }
  return "suggested";
}
