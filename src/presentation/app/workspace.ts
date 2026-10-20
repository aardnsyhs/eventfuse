import { createApplicationController } from "@/application";
import type { ControllerOptions } from "@/application/controller";
import type { ApplicationState, Namespace } from "@/application/types";
import { createBrowserRuntime } from "@/presentation/app/persistence";
import type { BrowserRuntime } from "@/presentation/app/persistence";

export type WorkspaceKey = string;
export const workspaceKey = (
  namespace: Namespace,
  eventId: string,
): WorkspaceKey => `${namespace}:${eventId}`;
export const parseWorkspaceKey = (
  key: WorkspaceKey,
): { namespace: Namespace; eventId: string } => {
  const at = key.indexOf(":");
  return {
    namespace: key.slice(0, at) as Namespace,
    eventId: key.slice(at + 1),
  };
};

export type WorkspaceController = ReturnType<
  typeof createApplicationController
> & {
  readonly key: WorkspaceKey;
  readonly eventId: string;
  readonly namespace: Namespace;
  dispose(): void;
};

export interface WorkspaceRegistry {
  readonly runtime: BrowserRuntime;
  acquire(namespace: Namespace, eventId: string): WorkspaceController;
  peek(key: WorkspaceKey): WorkspaceController | undefined;
  openKeys(): readonly WorkspaceKey[];
  subscribe(listener: () => void): () => void;
  version(): number;
}

export function createWorkspaceRegistry(
  runtime: BrowserRuntime = createBrowserRuntime(),
  extra: Omit<ControllerOptions, "persistence" | "nextStorageRevision"> = {},
): WorkspaceRegistry {
  const controllers = new Map<WorkspaceKey, WorkspaceController>();
  const owners = new Map<WorkspaceKey, number>();
  const listeners = new Set<() => void>();
  let version = 0;
  const notify = () => {
    version++;
    for (const listener of [...listeners]) listener();
  };
  return {
    runtime,
    acquire(namespace, eventId) {
      const key = workspaceKey(namespace, eventId);
      const existing = controllers.get(key);
      owners.set(key, (owners.get(key) ?? 0) + 1);
      if (existing) return existing;
      const base = createApplicationController({
        persistence: runtime.port,
        nextStorageRevision: runtime.nextStorageRevision,
        ...extra,
      });
      let disposed = false;
      const subscriptions = new Set<() => void>();
      const unavailable = {
        ok: false as const,
        errors: [
          {
            code: "NOT_READY" as const,
            message: "This workspace owner was disposed.",
            path: "",
          },
        ],
      };
      const controller: WorkspaceController = {
        ...base,
        subscribe(listener) {
          if (disposed) return () => {};
          const remove = base.subscribe(listener);
          const unsubscribe = () => {
            remove();
            subscriptions.delete(unsubscribe);
          };
          subscriptions.add(unsubscribe);
          return unsubscribe;
        },
        dispatch(command) {
          return disposed
            ? { ...unavailable, state: base.getSnapshot() }
            : base.dispatch(command);
        },
        async save() {
          return disposed ? unavailable : base.save();
        },
        async load(namespace, eventId, discardUnsaved) {
          return disposed
            ? unavailable
            : base.load(namespace, eventId, discardUnsaved);
        },
        key,
        eventId,
        namespace,
        dispose() {
          if (disposed) return;
          const remaining = (owners.get(key) ?? 1) - 1;
          if (remaining > 0) {
            owners.set(key, remaining);
            return;
          }
          owners.delete(key);
          disposed = true;
          for (const unsubscribe of subscriptions) unsubscribe();
          controllers.delete(key);
          notify();
        },
      };
      controllers.set(key, controller);
      notify();
      return controller;
    },
    peek(key) {
      return controllers.get(key);
    },
    openKeys: () => [...controllers.keys()],
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    version: () => version,
  };
}

export type { ApplicationState };
