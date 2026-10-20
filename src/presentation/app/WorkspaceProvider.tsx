import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { AppResult, Namespace } from "@/application/types";
import {
  createWorkspaceRegistry,
  workspaceKey,
} from "@/presentation/app/workspace";
import type { WorkspaceKey } from "@/presentation/app/workspace";
import type {
  CatalogEntry,
  WorkspaceContextValue,
} from "@/presentation/app/workspace-context";
import { WorkspaceContext } from "@/presentation/app/workspace-context";

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const registry = useMemo(() => createWorkspaceRegistry(), []);
  const [activeKey, setActiveKey] = useState<WorkspaceKey | null>(null);
  const [catalog, setCatalog] = useState<readonly CatalogEntry[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const owned = useRef(new Set<WorkspaceKey>());
  const lifetime = useRef(0);
  const mounted = useRef(true);

  const openWorkspace = useCallback(
    (namespace: Namespace, eventId: string) => {
      const key = workspaceKey(namespace, eventId);
      if (owned.current.has(key)) return registry.peek(key)!;
      const controller = registry.acquire(namespace, eventId);
      owned.current.add(workspaceKey(namespace, eventId));
      return controller;
    },
    [registry],
  );

  useEffect(() => {
    const lifetimeRef = lifetime;
    mounted.current = true;
    const generation = ++lifetimeRef.current;
    const held = owned.current;
    return () => {
      mounted.current = false;
      queueMicrotask(() => {
        if (lifetimeRef.current !== generation) return;
        for (const key of held) registry.peek(key)?.dispose();
        held.clear();
      });
    };
  }, [registry]);

  const refreshCatalog = useCallback(
    async (namespace: Namespace = "workspace") => {
      const result: AppResult<readonly CatalogEntry[]> =
        await registry.runtime.port.list(namespace);
      if (!mounted.current) return;
      if (result.ok) {
        setCatalog(result.value);
        setCatalogError(null);
      } else {
        setCatalog([]);
        setCatalogError(result.errors[0].message);
      }
    },
    [registry],
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      registry,
      activeKey,
      controller: activeKey ? (registry.peek(activeKey) ?? null) : null,
      catalog,
      catalogError,
      capabilities: registry.runtime.capabilities,
      openWorkspace,
      setActiveWorkspace: setActiveKey,
      refreshCatalog,
    }),
    [registry, activeKey, catalog, catalogError, openWorkspace, refreshCatalog],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}
