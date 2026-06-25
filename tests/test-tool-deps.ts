import { SpecRegistry } from "../src/application/services/spec-registry.js";
import type { SessionStorePort } from "../src/application/ports/session-store-port.js";

export function createTestSpecRegistry(): SpecRegistry {
  return new SpecRegistry();
}

export function createNoopSessionStore(): SessionStorePort {
  return {
    async get() {
      return null;
    },
    async save() {},
    async delete() {},
  };
}
