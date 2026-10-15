import { useCallback, useMemo, useSyncExternalStore } from "react";
import { selectWorkspace } from "@/application";
import { useWorkspaceContext } from "@/presentation/app/workspace-context";
import {
  useApplicationState,
  useWorkspaceView,
} from "@/presentation/app/store";
import type { ApplicationState } from "@/application/types";
import type { WorkspaceController } from "@/presentation/app/workspace";

export {
  useWorkspaceContext,
  useActiveController,
  useRequiredController,
} from "@/presentation/app/workspace-context";
export type {
  CatalogEntry,
  WorkspaceContextValue,
} from "@/presentation/app/workspace-context";

export interface WorkspaceHandle {
  readonly controller: WorkspaceController;
  readonly state: ApplicationState;
  readonly view: ReturnType<typeof useWorkspaceView>;
  readonly dispatch: WorkspaceController["dispatch"];
  readonly canDispatch: boolean;
}

export function useWorkspaceHandle(
  controller: WorkspaceController,
): WorkspaceHandle {
  const state = useApplicationState(controller);
  const view = useMemo(() => selectWorkspace(state), [state]);
  const dispatch = useCallback<WorkspaceController["dispatch"]>(
    (command) => controller.dispatch(command),
    [controller],
  );
  return {
    controller,
    state,
    view,
    dispatch,
    canDispatch: state.persistence.status !== "loading",
  };
}

/** Subscribe to registry lifecycle so disposal is reflected in the UI. */
export function useRegistryVersion(): number {
  const registry = useWorkspaceContext().registry;
  return useSyncExternalStore(
    registry.subscribe,
    registry.version,
    registry.version,
  );
}
