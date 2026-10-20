import { createContext, useContext } from "react";
import type { Namespace } from "@/application/types";
import type {
  WorkspaceController,
  WorkspaceKey,
  WorkspaceRegistry,
} from "@/presentation/app/workspace";

export interface CatalogEntry {
  readonly eventId: string;
  readonly name: string;
}

export interface WorkspaceContextValue {
  readonly registry: WorkspaceRegistry;
  readonly activeKey: WorkspaceKey | null;
  readonly controller: WorkspaceController | null;
  readonly catalog: readonly CatalogEntry[];
  readonly catalogError: string | null;
  readonly capabilities: WorkspaceRegistry["runtime"]["capabilities"];
  openWorkspace(namespace: Namespace, eventId: string): WorkspaceController;
  setActiveWorkspace(key: WorkspaceKey | null): void;
  refreshCatalog(namespace?: Namespace): Promise<void>;
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(
  null,
);

export function useWorkspaceContext(): WorkspaceContextValue {
  const value = useContext(WorkspaceContext);
  if (!value)
    throw new Error("useWorkspaceContext requires a WorkspaceProvider.");
  return value;
}

export function useActiveController(): WorkspaceController | null {
  return useWorkspaceContext().controller;
}

export function useRequiredController(): WorkspaceController {
  const controller = useActiveController();
  if (!controller) throw new Error("This screen requires an open workspace.");
  return controller;
}
