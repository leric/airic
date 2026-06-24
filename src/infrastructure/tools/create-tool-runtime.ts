import type { FileSystemPort } from "../../application/ports/file-system-port.js";
import type { SessionStorePort } from "../../application/ports/session-store-port.js";
import type { ToolPolicyPort } from "../../application/ports/tool-policy-port.js";
import { MutationCoordinator } from "../../application/services/mutation-coordinator.js";
import {
  KernelToolRegistry,
  type KernelToolRegistryPort,
} from "../../application/services/kernel-tool-registry.js";
import { ToolExecutor } from "../../application/services/tool-executor.js";
import type { EditStore } from "../../application/services/edit-store.js";
import type { EditLog } from "../../application/services/edit-log.js";
import type { DiffService } from "../diff/diff-service.js";
import { createDefaultToolRegistry } from "./create-tool-registry.js";

export type ToolRuntimeDeps = {
  fs: FileSystemPort;
  sessionStore: SessionStorePort;
  diffService: DiffService;
  editStore: EditStore;
  editLog: EditLog;
  toolPolicy?: ToolPolicyPort;
};

export function createKernelToolStack(deps: ToolRuntimeDeps): KernelToolRegistryPort {
  const registry = createDefaultToolRegistry({ fs: deps.fs });
  const mutationCoordinator = new MutationCoordinator({
    fs: deps.fs,
    sessionStore: deps.sessionStore,
    diffService: deps.diffService,
    editStore: deps.editStore,
    editLog: deps.editLog,
  });
  const executor = new ToolExecutor({
    registry,
    mutationCoordinator,
    toolPolicy: deps.toolPolicy,
  });
  return new KernelToolRegistry(executor, registry);
}
