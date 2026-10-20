import { useCallback, useMemo, useSyncExternalStore } from "react";
import { selectWorkspace } from "@/application";
import type {
  ApplicationState,
  Command,
  CommandResult,
} from "@/application/types";
import type { WorkspaceController } from "@/presentation/app/workspace";

const snapshots = new WeakMap<WorkspaceController, ApplicationState>();
const deriveCache = new WeakMap<
  ApplicationState,
  { key: string; value: ReturnType<typeof selectWorkspace> }
>();

export function stableSnapshot(controller: WorkspaceController) {
  const cached = snapshots.get(controller);
  const current = controller.getSnapshot();
  if (cached === current) return cached;
  snapshots.set(controller, current);
  return current;
}

export function useApplicationState(
  controller: WorkspaceController,
): ApplicationState {
  const subscribe = useCallback(
    (notify: () => void) => controller.subscribe(notify),
    [controller],
  );
  const getSnapshot = useCallback(
    () => stableSnapshot(controller),
    [controller],
  );
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useWorkspaceView(controller: WorkspaceController) {
  const state = useApplicationState(controller);
  return useMemo(() => {
    const cached = deriveCache.get(state);
    if (cached) return cached.value;
    const value = selectWorkspace(state);
    deriveCache.set(state, { key: controller.key, value });
    return value;
  }, [state, controller.key]);
}

export interface DispatchHandle {
  readonly dispatch: (command: Command) => CommandResult;
  readonly canDispatch: boolean;
}

export function useDispatch(controller: WorkspaceController): DispatchHandle {
  const state = useApplicationState(controller);
  const dispatch = useCallback(
    (command: Command) => controller.dispatch(command),
    [controller],
  );
  return {
    dispatch,
    canDispatch: state.persistence.status !== "loading",
  };
}
