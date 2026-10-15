import type { LockPort, StoragePort } from "./local-storage";
export class MemoryStorage implements StoragePort {
  private readonly values = new Map<string, string>();
  readError: Error | null = null;
  writeError: Error | null = null;
  writes = 0;
  get length() {
    if (this.readError) throw this.readError;
    return this.values.size;
  }
  key(index: number) {
    if (this.readError) throw this.readError;
    return [...this.values.keys()][index] ?? null;
  }
  getItem(key: string) {
    if (this.readError) throw this.readError;
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.writeError) throw this.writeError;
    this.values.set(key, value);
    this.writes++;
  }
}
export function createMemoryLocks(): LockPort {
  const tails = new Map<string, Promise<void>>();
  return {
    async exclusive<T>(name: string, work: () => Promise<T>): Promise<T> {
      const before = tails.get(name) ?? Promise.resolve();
      let release!: () => void;
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const tail = before.then(() => gate);
      tails.set(name, tail);
      await before;
      try {
        return await work();
      } finally {
        release();
        if (tails.get(name) === tail) tails.delete(name);
      }
    },
  };
}
