import type {
  ApplicationState,
  AppResult,
  Command,
  CommandResult,
  Namespace,
  PersistencePort,
  WorkspaceDocument,
} from "./types";
import { emptyState, execute, restoreState } from "./commands";
import { appError, fail, freeze } from "./common";
import { persistable } from "./validation";

export interface ControllerOptions {
  readonly persistence?: PersistencePort;
  readonly nextStorageRevision?: () => string;
}
export function createApplicationController(options: ControllerOptions = {}) {
  let state = emptyState(),
    busy = false,
    dispatching = false;
  const listeners = new Set<() => void>();
  const publish = (next: ApplicationState) => {
    state = freeze(next);
    for (const listener of [...listeners]) listener();
  };
  const storageFailure = <T>(result: AppResult<T>): AppResult<T> => {
    if (!result.ok)
      publish({
        ...state,
        persistence: {
          ...state.persistence,
          status: "error",
          error: result.errors[0],
        },
      });
    return result;
  };
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispatch(command: Command): CommandResult {
      if (dispatching || state.persistence.status === "loading") {
        const errors = [
          appError("STORAGE_BUSY", "Wait for the current restore to finish."),
        ];
        return { ok: false, state, errors };
      }
      dispatching = true;
      try {
        const previousStatus = state.calculation.status;
        if (
          [
            "baseline.validate",
            "baseline.apply",
            "incident.apply",
            "recovery.apply",
            "recovery.compare",
            "brief.prepare",
          ].includes(command.type)
        )
          publish({
            ...state,
            calculation: { ...state.calculation, status: "validating" },
          });
        // Validation uses the pre-command currentness, never its transient notification state.
        const before =
          state.calculation.status === "validating"
            ? {
                ...state,
                calculation: { ...state.calculation, status: previousStatus },
              }
            : state;
        const result = execute(before, command);
        publish(result.state);
        return result;
      } finally {
        dispatching = false;
      }
    },
    async save(): Promise<AppResult<WorkspaceDocument>> {
      if (busy)
        return fail(
          appError(
            "STORAGE_BUSY",
            "Another persistence operation is in progress.",
          ),
        );
      if (!options.persistence || !options.nextStorageRevision)
        return storageFailure(
          fail(
            appError(
              "STORAGE_UNAVAILABLE",
              "Persistence and a unique write-token provider are required.",
            ),
          ),
        );
      const payload = persistable(state);
      if (!payload.ok) return storageFailure(payload);
      busy = true;
      const generation = state.generation,
        expected = state.persistence.expectedRevision;
      publish({
        ...state,
        persistence: { ...state.persistence, status: "saving", error: null },
      });
      try {
        const result = await options.persistence.save(
          payload.value,
          expected,
          options.nextStorageRevision(),
        );
        if (!result.ok) return storageFailure(result);
        const unchanged = state.generation === generation;
        publish({
          ...state,
          document: unchanged
            ? result.value
            : state.document
              ? {
                  ...state.document,
                  storageRevision: result.value.storageRevision,
                }
              : null,
          persistence: {
            status: unchanged ? "saved" : "unsaved",
            expectedRevision: result.value.storageRevision,
            error: null,
          },
        });
        return result;
      } catch {
        return storageFailure(
          fail(
            appError(
              "STORAGE_UNAVAILABLE",
              "Save failed; in-memory work was preserved.",
            ),
          ),
        );
      } finally {
        busy = false;
      }
    },
    async load(
      namespace: Namespace,
      eventId: string,
      discardUnsaved = false,
    ): Promise<AppResult<WorkspaceDocument | null>> {
      if (busy)
        return fail(
          appError(
            "STORAGE_BUSY",
            "Another persistence operation is in progress.",
          ),
        );
      if (!options.persistence)
        return storageFailure(
          fail(
            appError(
              "STORAGE_UNAVAILABLE",
              "No persistence adapter configured.",
            ),
          ),
        );
      if (
        state.document &&
        state.persistence.status !== "saved" &&
        !discardUnsaved
      )
        return fail(
          appError(
            "UNSAVED_CHANGES",
            "Explicitly confirm replacement of the current session.",
          ),
        );
      busy = true;
      publish({
        ...state,
        persistence: { ...state.persistence, status: "loading", error: null },
      });
      try {
        const result = await options.persistence.load(namespace, eventId);
        if (!result.ok) return storageFailure(result);
        if (result.value) publish(restoreState(result.value));
        else
          publish({
            ...state,
            persistence: {
              ...state.persistence,
              status: state.document ? "unsaved" : "idle",
            },
          });
        return result;
      } catch {
        return storageFailure(
          fail(
            appError(
              "STORAGE_UNAVAILABLE",
              "Restore failed; current session was preserved.",
            ),
          ),
        );
      } finally {
        busy = false;
      }
    },
  };
}
