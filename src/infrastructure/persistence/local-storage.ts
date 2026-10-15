import type {
  AppResult,
  Namespace,
  PersistencePort,
  WorkspaceDocument,
} from "../../application/types";
import { appError, fail, safeId, success } from "../../application/common";
import { validateDocument } from "../../application/validation";

export const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024;
export interface StoragePort {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export interface LockPort {
  exclusive<T>(name: string, work: () => Promise<T>): Promise<T>;
}
export const storageKey = (namespace: Namespace, eventId: string): string =>
  `eventfuse:v1:${namespace}:${encodeURIComponent(eventId)}`;
export function decodeDocument(raw: string): AppResult<WorkspaceDocument> {
  if (raw.length * 2 > MAX_DOCUMENT_BYTES)
    return fail(
      appError(
        "STORAGE_TOO_LARGE",
        "Saved document exceeds the 2 MiB UTF-16 limit.",
      ),
    );
  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    return fail(
      appError(
        "STORAGE_CORRUPT",
        "Saved JSON is malformed; the existing record was preserved.",
      ),
    );
  }
  return validateDocument(input);
}
export function encodeDocument(document: WorkspaceDocument): AppResult<string> {
  const valid = validateDocument(document);
  if (!valid.ok) return valid;
  const raw = JSON.stringify(valid.value);
  return raw.length * 2 <= MAX_DOCUMENT_BYTES
    ? success(raw)
    : fail(
        appError(
          "STORAGE_TOO_LARGE",
          "Workspace exceeds the 2 MiB UTF-16 limit.",
        ),
      );
}
const storageError = (cause: unknown) =>
  appError(
    cause instanceof Error &&
      ["QuotaExceededError", "NS_ERROR_DOM_QUOTA_REACHED"].includes(cause.name)
      ? "STORAGE_QUOTA"
      : "STORAGE_UNAVAILABLE",
    cause instanceof Error &&
      ["QuotaExceededError", "NS_ERROR_DOM_QUOTA_REACHED"].includes(cause.name)
      ? "Storage quota exceeded; current-session work remains unsaved."
      : "Browser storage is unavailable; current-session work is preserved.",
  );
export function createLocalPersistence(
  storage: StoragePort,
  locks?: LockPort,
): PersistencePort {
  return {
    async load(namespace, eventId) {
      if (!safeId(eventId) || !["demo", "workspace"].includes(namespace))
        return fail(appError("INVALID_INPUT", "Invalid workspace identity."));
      try {
        const raw = storage.getItem(storageKey(namespace, eventId));
        if (raw === null) return success(null);
        const decoded = decodeDocument(raw);
        if (!decoded.ok) return decoded;
        return decoded.value.namespace === namespace &&
          decoded.value.editing.baseline.event.id === eventId
          ? decoded
          : fail(
              appError(
                "INVALID_DOCUMENT",
                "Saved workspace identity differs from its storage key.",
              ),
            );
      } catch (cause) {
        return fail(storageError(cause));
      }
    },
    async save(document, expectedRevision, writeRevision) {
      if (
        !safeId(writeRevision) ||
        writeRevision === expectedRevision ||
        writeRevision === "unsaved"
      )
        return fail(
          appError("INVALID_INPUT", "Provide a new unique write token."),
        );
      const encoded = encodeDocument({
        ...document,
        storageRevision: writeRevision,
      });
      if (!encoded.ok) return encoded;
      const key = storageKey(
        document.namespace,
        document.editing.baseline.event.id,
      );
      const write = async (): Promise<AppResult<WorkspaceDocument>> => {
        try {
          const existing = storage.getItem(key);
          if (existing === null && expectedRevision !== null)
            return fail(
              appError(
                "STORAGE_CONFLICT",
                "Saved workspace was removed by another writer.",
              ),
            );
          if (existing !== null) {
            const decoded = decodeDocument(existing);
            if (!decoded.ok) return decoded;
            if (
              decoded.value.namespace !== document.namespace ||
              decoded.value.editing.baseline.event.id !==
                document.editing.baseline.event.id
            )
              return fail(
                appError(
                  "INVALID_DOCUMENT",
                  "Saved workspace identity differs from its storage key.",
                ),
              );
            if (decoded.value.storageRevision !== expectedRevision)
              return fail(
                appError(
                  "STORAGE_CONFLICT",
                  "Another tab saved a newer workspace; reload or keep the current session.",
                ),
              );
          }
          if (!locks)
            return fail(
              appError(
                "LOCK_UNAVAILABLE",
                "Exclusive browser locks are unavailable; no write was attempted.",
              ),
            );
          storage.setItem(key, encoded.value);
          return success({
            ...structuredClone(document),
            storageRevision: writeRevision,
          });
        } catch (cause) {
          return fail(storageError(cause));
        }
      };
      try {
        return locks ? await locks.exclusive(key, write) : await write();
      } catch (cause) {
        return fail(storageError(cause));
      }
    },
    async list(namespace) {
      if (!["demo", "workspace"].includes(namespace))
        return fail(appError("INVALID_INPUT", "Unknown namespace."));
      try {
        const prefix = `eventfuse:v1:${namespace}:`,
          found: { eventId: string; name: string }[] = [];
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i);
          if (!key?.startsWith(prefix)) continue;
          const raw = storage.getItem(key);
          if (raw === null) continue;
          const document = decodeDocument(raw);
          if (!document.ok) return document;
          const event = document.value.editing.baseline.event;
          if (
            storageKey(namespace, event.id) !== key ||
            document.value.namespace !== namespace
          )
            return fail(
              appError("INVALID_DOCUMENT", "Catalog identity mismatch."),
            );
          found.push({ eventId: event.id, name: event.name });
        }
        return success(
          found.sort((a, b) =>
            a.eventId < b.eventId ? -1 : a.eventId > b.eventId ? 1 : 0,
          ),
        );
      } catch (cause) {
        return fail(storageError(cause));
      }
    },
  };
}
export function createBrowserPersistence(): AppResult<PersistencePort> {
  try {
    if (typeof window === "undefined")
      return fail(
        appError(
          "STORAGE_UNAVAILABLE",
          "Browser storage is unavailable in this environment.",
        ),
      );
    const manager =
      typeof navigator !== "undefined" ? navigator.locks : undefined;
    const locks: LockPort | undefined = manager
      ? {
          exclusive: (name, work) =>
            manager.request(name, { mode: "exclusive" }, work),
        }
      : undefined;
    return success(createLocalPersistence(window.localStorage, locks));
  } catch (cause) {
    return fail(storageError(cause));
  }
}
