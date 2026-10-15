import { calculate } from "../engine/index";
import type { ApplicationState } from "./types";
import { appError, engineErrors, fail, success } from "./common";
import {
  baselineDirty,
  baselineOf,
  current,
  incidentDirty,
  incidentOf,
  optionsOf,
  recoveryDirty,
} from "./context";
export function selectWorkspace(state: ApplicationState) {
  const d = state.document,
    ready = current(state),
    incident = d ? incidentOf(d) : null;
  const selectedId =
    incident && d ? (d.selectedOptionByIncident[incident.id] ?? null) : null;
  const selected =
    ready && selectedId && d ? (d.recoveryOptions[selectedId] ?? null) : null;
  const comparison = ready ? state.calculation.comparison : null;
  const briefReady =
    !!selected &&
    !!comparison?.alternatives.some(
      (a) => a.recoveryOptionId === selected.id && a.result.ok,
    );
  const canDispatch = state.persistence.status !== "loading";
  return {
    event: state.editing?.baseline.event ?? null,
    status:
      state.persistence.status === "loading" ||
      state.persistence.status === "saving"
        ? state.persistence.status
        : state.persistence.error
          ? ("storage-error" as const)
          : state.calculation.status,
    baselineValidity: state.baselineValidation,
    baselineDirty: baselineDirty(state),
    incidentDirty: incidentDirty(state),
    recoveryDirty: recoveryDirty(state),
    dirty:
      (!!d && state.persistence.status !== "saved") ||
      baselineDirty(state) ||
      incidentDirty(state) ||
      recoveryDirty(state),
    activeBaseline: d ? baselineOf(d) : null,
    revisions: d
      ? Object.values(d.baselineVersions).sort((a, b) =>
          a.baselineVersion < b.baselineVersion
            ? -1
            : a.baselineVersion > b.baselineVersion
              ? 1
              : 0,
        )
      : [],
    incidentStatus:
      !incident || incident.startDelayMinutes === 0
        ? ("none" as const)
        : incidentDirty(state)
          ? ("dirty" as const)
          : ready
            ? ("applied" as const)
            : ("stale" as const),
    appliedIncident: incident,
    impact: ready ? state.calculation.incident : null,
    baselineResult: ready ? state.calculation.baseline : null,
    optionResults: comparison?.alternatives ?? [],
    comparison,
    selected,
    warnings:
      comparison?.alternatives.flatMap((a) =>
        a.result.ok ? a.result.value.validationWarnings : [],
      ) ?? [],
    briefReady,
    briefView: d?.decisionBriefs.at(-1) ?? null,
    errors: [
      ...state.errors,
      ...(state.persistence.error ? [state.persistence.error] : []),
    ],
    actions: {
      createEvent: canDispatch && !d,
      edit: canDispatch && !!d,
      applyBaseline: canDispatch && !!d,
      applyIncident:
        canDispatch &&
        !!d &&
        !baselineDirty(state) &&
        !!state.editing?.incident,
      compare:
        canDispatch &&
        !!d &&
        !baselineDirty(state) &&
        !incidentDirty(state) &&
        !recoveryDirty(state) &&
        optionsOf(d).length > 0,
      prepareBrief: canDispatch && briefReady,
      save: !!d && !["loading", "saving"].includes(state.persistence.status),
    },
  };
}
export function selectHistoricalIncident(
  state: ApplicationState,
  incidentId: string,
) {
  const d = state.document,
    incident = d?.incidents[incidentId];
  if (!d || !incident)
    return fail(appError("NOT_FOUND", "Historical incident not found."));
  const baseline = d.baselineVersions[incident.baselineVersion];
  if (!baseline)
    return fail(
      appError("STALE_CONTEXT", "Historical source revision is missing."),
    );
  const result = calculate({
    kind: "incident",
    baseline,
    incident,
    currency: d.currency,
    limits: d.limits,
    scenarioId: `incident:${incident.id}`,
  });
  return result.ok
    ? success({
        historical: incident.baselineVersion !== d.currentBaselineVersion,
        result: result.value,
      })
    : fail(...engineErrors(result.errors));
}
