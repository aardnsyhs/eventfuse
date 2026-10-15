export {
  createLocalPersistence,
  createBrowserPersistence,
  decodeDocument,
  encodeDocument,
  storageKey,
  MAX_DOCUMENT_BYTES,
} from "./local-storage";
export type { StoragePort, LockPort } from "./local-storage";
export { MemoryStorage, createMemoryLocks } from "./memory";
