import type {
  BaselineSnapshot,
  ComparisonRequest,
  Incident,
  RecoveryOption,
} from "../engine/index";
import type { ApplicationState, WorkspaceDocument } from "./types";
import { same } from "./common";
export const baselineOf = (d: WorkspaceDocument): BaselineSnapshot | null =>
  d.currentBaselineVersion
    ? (d.baselineVersions[d.currentBaselineVersion] ?? null)
    : null;
export const incidentOf = (d: WorkspaceDocument): Incident | null =>
  d.activeIncidentId ? (d.incidents[d.activeIncidentId] ?? null) : null;
export const optionsOf = (
  d: WorkspaceDocument,
  incidentId = d.activeIncidentId,
): readonly RecoveryOption[] =>
  Object.values(d.recoveryOptions)
    .filter((o) => o.incidentId === incidentId)
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
export const incidentDraftOf = (i: Incident) => ({
  baselineVersion: i.baselineVersion,
  targetActivityId: i.targetActivityId,
  startDelayMinutes: i.startDelayMinutes,
  title: i.title,
  description: i.description,
});
export const baselineDirty = (s: ApplicationState): boolean =>
  !!s.document &&
  !!s.editing &&
  !same(s.editing.baseline, baselineOf(s.document));
export const incidentDirty = (s: ApplicationState): boolean => {
  if (!s.document || !s.editing) return false;
  const i = incidentOf(s.document);
  return !same(s.editing.incident, i ? incidentDraftOf(i) : null);
};
export const recoveryDirty = (s: ApplicationState): boolean =>
  !!s.document &&
  !!s.editing &&
  Object.entries(s.editing.recoveries).some(
    ([id, o]) => !same(o, s.document!.recoveryOptions[id]),
  );
export const current = (s: ApplicationState): boolean =>
  !!s.document &&
  !baselineDirty(s) &&
  !incidentDirty(s) &&
  !recoveryDirty(s) &&
  !["dirty", "invalid", "stale", "validating"].includes(s.calculation.status);
export function comparisonSource(
  d: WorkspaceDocument,
  incident = incidentOf(d),
): ComparisonRequest | null {
  if (!incident) return null;
  const baseline = d.baselineVersions[incident.baselineVersion];
  if (!baseline) return null;
  const alternatives = optionsOf(d, incident.id);
  return {
    baseline,
    incident,
    currency: d.currency,
    limits: d.limits,
    scenarioIds: {
      baseline: `baseline:${baseline.baselineVersion}`,
      incident: `incident:${incident.id}`,
      recoveries: Object.fromEntries(
        alternatives.map((o) => [o.id, `recovery:${incident.id}:${o.id}`]),
      ),
    },
    alternatives,
  };
}
