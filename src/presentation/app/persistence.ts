import { createBrowserPersistence } from "@/infrastructure/persistence";
import type { PersistencePort } from "@/application/types";

export interface BrowserRuntime {
  readonly port: PersistencePort;
  readonly capabilities: {
    readonly storage: "available" | "unavailable";
    readonly locks: "available" | "unavailable";
    readonly detail: string;
  };
  readonly nextStorageRevision: () => string;
}

const randomTokens = (): string => {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function")
    return cryptoApi.randomUUID();
  if (cryptoApi && typeof cryptoApi.getRandomValues === "function") {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  throw new Error(
    "A cryptographic browser random source is required to save safely.",
  );
};

export function createWriteTokens(): () => string {
  let previous: string | null = null;
  return () => {
    let token = randomTokens();
    while (token === previous || token === "unsaved") token = randomTokens();
    previous = token;
    return token;
  };
}

export function detectLocks(): "available" | "unavailable" {
  return typeof navigator !== "undefined" && !!navigator.locks
    ? "available"
    : "unavailable";
}

export function createBrowserRuntime(): BrowserRuntime {
  const locks = detectLocks();
  const created = createBrowserPersistence();
  if (!created.ok)
    return {
      port: unavailablePort(created.errors[0].message),
      capabilities: {
        storage: "unavailable",
        locks,
        detail: created.errors[0].message,
      },
      nextStorageRevision: createWriteTokens(),
    };
  return {
    port: created.value,
    capabilities: {
      storage: "available",
      locks,
      detail:
        locks === "available"
          ? "localStorage with Web Locks serialization"
          : "localStorage without Web Locks; saves are refused to avoid silent overwrite",
    },
    nextStorageRevision: createWriteTokens(),
  };
}

function unavailablePort(detail: string): PersistencePort {
  const failure = {
    ok: false as const,
    errors: [
      {
        code: "STORAGE_UNAVAILABLE" as const,
        message: detail,
        path: "",
      },
    ],
  };
  return {
    async load() {
      return failure;
    },
    async save() {
      return failure;
    },
    async list() {
      return failure;
    },
  };
}
