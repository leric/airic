import type { AiricConfig } from "../../application/ports/config-loader-port.js";
import type { FileSystemPort } from "../../application/ports/file-system-port.js";
import type { SessionStorePort } from "../../application/ports/session-store-port.js";
import type { ToolPolicyPort } from "../../application/ports/tool-policy-port.js";
import type { SummarizationPort } from "../../application/ports/summarization-port.js";
import { HistoryAuditLog } from "../../application/services/history-audit-log.js";
import { HistoryChangeStore } from "../../application/services/history-change-store.js";
import { HistoryMutationCoordinator } from "../../application/services/history-mutation-coordinator.js";
import { MutationCoordinator } from "../../application/services/mutation-coordinator.js";
import {
  KernelToolRegistry,
  type KernelToolRegistryPort,
} from "../../application/services/kernel-tool-registry.js";
import type { SpecRegistry } from "../../application/services/spec-registry.js";
import { ToolExecutor } from "../../application/services/tool-executor.js";
import type { EditStore } from "../../application/services/edit-store.js";
import type { EditLog } from "../../application/services/edit-log.js";
import type { DiffService } from "../diff/diff-service.js";
import { PiSummarizationAdapter } from "../agent/pi-summarization-adapter.js";
import { createHistoryTools } from "./history/create-history-tools.js";
import { createDefaultToolRegistry } from "./create-tool-registry.js";

export type ToolRuntimeDeps = {
  workspaceRoot: string;
  fs: FileSystemPort;
  sessionStore: SessionStorePort;
  specRegistry: SpecRegistry;
  diffService: DiffService;
  editStore: EditStore;
  editLog: EditLog;
  llm: AiricConfig["llm"];
  toolPolicy?: ToolPolicyPort;
  summarizationPort?: SummarizationPort;
  historyChangeStore?: HistoryChangeStore;
  historyAuditLog?: HistoryAuditLog;
};

export function createKernelToolStack(deps: ToolRuntimeDeps): KernelToolRegistryPort {
  const historyChangeStore = deps.historyChangeStore ?? new HistoryChangeStore();
  const summarizationPort = deps.summarizationPort ?? new PiSummarizationAdapter();
  const historyAuditLog =
    deps.historyAuditLog ?? new HistoryAuditLog(deps.fs, deps.workspaceRoot);

  const historyTools = createHistoryTools({
    sessionStore: deps.sessionStore,
    summarizationPort,
    historyChangeStore,
    historyAuditLog,
    getLlmConfig: () => deps.llm,
  });

  const registry = createDefaultToolRegistry({
    fs: deps.fs,
    sessionStore: deps.sessionStore,
    specRegistry: deps.specRegistry,
    historyTools,
  });

  const mutationCoordinator = new MutationCoordinator({
    fs: deps.fs,
    sessionStore: deps.sessionStore,
    diffService: deps.diffService,
    editStore: deps.editStore,
    editLog: deps.editLog,
  });

  const historyMutationCoordinator = new HistoryMutationCoordinator({
    sessionStore: deps.sessionStore,
    historyChangeStore,
    historyAuditLog,
  });

  const executor = new ToolExecutor({
    registry,
    mutationCoordinator,
    historyMutationCoordinator,
    toolPolicy: deps.toolPolicy,
  });

  return new KernelToolRegistry(executor, registry);
}
