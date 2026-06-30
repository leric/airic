import type { Session } from "../../domain/session/session.js";
import type { AiricToolResult } from "../../domain/tool/tool-result.js";
import type { PendingHistoryChange } from "../../domain/tool/pending-history-change.js";
import type { SessionStorePort } from "../ports/session-store-port.js";
import type { ToolExecutionEvents } from "../ports/tool-executor-port.js";
import type { HistoryPermissionGate } from "../ports/agent-runtime-port.js";
import { applyHistoryChange } from "./history-lifecycle.js";
import type { HistoryAuditLog } from "./history-audit-log.js";
import type { HistoryChangeStore } from "./history-change-store.js";

export type HistoryMutationCoordinatorDeps = {
  sessionStore: SessionStorePort;
  historyChangeStore: HistoryChangeStore;
  historyAuditLog: HistoryAuditLog;
};

export class HistoryMutationCoordinator {
  constructor(private readonly deps: HistoryMutationCoordinatorDeps) {}

  async confirmAndApply(
    session: Session,
    pendingId: string,
    ctx: {
      toolCallId: string;
      permissionGate?: HistoryPermissionGate;
      initiatedBy?: "user" | "agent";
    },
    events?: ToolExecutionEvents,
  ): Promise<AiricToolResult> {
    const pending = this.deps.historyChangeStore.get(pendingId);
    if (!pending) {
      throw new Error(`Pending history change not found: ${pendingId}`);
    }

    if (pending.sessionId !== session.id) {
      throw new Error("Pending history change belongs to a different session.");
    }

    const permission = await this.requestPermission(pending, ctx, events);
    if (!permission.allowed) {
      this.deps.historyChangeStore.delete(pendingId);
      return {
        content: [
          {
            type: "text",
            text: `History change rejected by user (${pending.action}).`,
          },
        ],
      };
    }

    applyHistoryChange(session, pending.applyPayload);
    session.updatedAt = new Date().toISOString();
    await this.deps.sessionStore.save(session);

    await this.deps.historyAuditLog.append({
      timestamp: new Date().toISOString(),
      sessionId: session.id,
      action: pending.action,
      initiatedBy: ctx.initiatedBy ?? "agent",
      params: { preview: pending.previewText },
      resolvedNodes: extractResolvedNodes(pending),
    });

    this.deps.historyChangeStore.delete(pendingId);

    return {
      content: [
        {
          type: "text",
          text: `Applied history.${pending.action}.`,
        },
      ],
      details: {
        action: pending.action,
        applied: true,
      },
    };
  }

  private async requestPermission(
    pending: PendingHistoryChange,
    ctx: {
      toolCallId: string;
      permissionGate?: HistoryPermissionGate;
    },
    events?: ToolExecutionEvents,
  ): Promise<{ allowed: boolean }> {
    const gate = events?.onProposeHistoryChange ?? ctx.permissionGate;
    if (!gate) {
      return { allowed: true };
    }

    const decision = await gate(pending, ctx.toolCallId);
    return { allowed: decision === "allow" };
  }
}

function extractResolvedNodes(pending: PendingHistoryChange): string[] {
  if (pending.applyPayload.action === "mark") {
    return [pending.applyPayload.nodeId];
  }
  return [
    pending.applyPayload.summaryMeta.source.fromId,
    pending.applyPayload.summaryMeta.source.toId,
  ];
}
