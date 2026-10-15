import {
  buildDecisionBrief,
  calculate,
  DEFAULT_LIMITS,
  parseRecoveryCost,
  validateBaseline,
} from "../engine/index";
import type {
  BaselineSnapshot,
  BriefMetadata,
  ComparisonRequest,
  DecisionBrief,
  Incident,
  RecoveryOption,
} from "../engine/index";
import type { AppResult, EditingState, WorkspaceDocument } from "./types";
import {
  appError,
  engineErrors,
  fail,
  isRecord,
  own,
  safeId,
  same,
  success,
} from "./common";
import { baselineOf, incidentOf, optionsOf } from "./context";

const keys = (
  value: unknown,
  required: readonly string[],
  optional: readonly string[] = [],
): value is Record<string, unknown> =>
  isRecord(value) &&
  required.every((k) => own(value, k)) &&
  Object.keys(value).every((k) => required.includes(k) || optional.includes(k));
const record = (value: unknown): value is Record<string, unknown> =>
  isRecord(value) && Object.keys(value).every(safeId);
const confirmed = (o: RecoveryOption) =>
  o.approvalStatus !== "confirmed" ||
  (typeof o.approvalContext === "string" &&
    o.approvalContext.trim().length > 0);
const invalid = (message: string, path = "") =>
  fail(appError("INVALID_DOCUMENT", message, path));
export function validateEditing(
  editing: unknown,
  document: WorkspaceDocument,
): AppResult<EditingState> {
  if (
    !keys(editing, ["baseline", "incident", "recoveries"]) ||
    !record(editing.recoveries)
  )
    return invalid("Invalid editing state.", "/editing");
  const baseline = validateBaseline(editing.baseline, "draft");
  if (!baseline.ok) return fail(...engineErrors(baseline.errors));
  const eventId = document.editing.baseline.event.id;
  if (baseline.value.event.id !== eventId)
    return invalid(
      "Draft event identity differs from its workspace.",
      "/editing/baseline/event/id",
    );
  if (editing.incident !== null) {
    if (
      !keys(editing.incident, [
        "baselineVersion",
        "targetActivityId",
        "startDelayMinutes",
        "title",
        "description",
      ])
    )
      return invalid("Malformed incident draft.", "/editing/incident");
    const version = editing.incident.baselineVersion;
    if (
      !safeId(version) ||
      version !== document.currentBaselineVersion ||
      !own(document.baselineVersions, version)
    )
      return invalid(
        "Incident draft has a stale baseline.",
        "/editing/incident/baselineVersion",
      );
    const source = document.baselineVersions[version];
    const checked = calculate({
      kind: "incident",
      baseline: source,
      currency: document.currency,
      limits: document.limits,
      scenarioId: "validate-draft",
      incident: {
        ...editing.incident,
        id: "draft-validation",
        eventId,
        createdAt: source.event.updatedAt,
      } as unknown as Incident,
    });
    if (!checked.ok) return fail(...engineErrors(checked.errors));
  }
  const active = incidentOf(document);
  const allIds = new Set(optionsOf(document).map((o) => o.id));
  for (const [id, candidate] of Object.entries(editing.recoveries)) {
    allIds.add(id);
    if (
      !active ||
      !isRecord(candidate) ||
      candidate.id !== id ||
      candidate.status !== "draft" ||
      candidate.incidentId !== active.id
    )
      return invalid(
        "Recovery draft has a stale identity.",
        `/editing/recoveries/${id}`,
      );
    const option = candidate as unknown as RecoveryOption;
    if (!confirmed(option))
      return fail(
        appError(
          "APPROVAL_CONTEXT_REQUIRED",
          "Confirmed records require external context.",
        ),
      );
    const checked = calculate({
      kind: "recovery",
      baseline: document.baselineVersions[active.baselineVersion],
      incident: active,
      recovery: option,
      currency: document.currency,
      limits: document.limits,
      scenarioId: "validate-option-draft",
    });
    if (!checked.ok) return fail(...engineErrors(checked.errors));
  }
  if (allIds.size > 3)
    return invalid("Too many active option drafts.", "/editing/recoveries");
  return success(structuredClone(editing) as unknown as EditingState);
}
function validateBrief(
  candidate: unknown,
  document: WorkspaceDocument,
): AppResult<DecisionBrief> {
  if (
    !isRecord(candidate) ||
    !safeId(candidate.baselineVersion) ||
    !own(document.baselineVersions, candidate.baselineVersion) ||
    !safeId(candidate.incidentId) ||
    !own(document.incidents, candidate.incidentId) ||
    !same(candidate.incidentSnapshot, document.incidents[candidate.incidentId])
  )
    return invalid("Brief source revision or incident is missing.");
  if (
    !Array.isArray(candidate.comparisonOptionSnapshots) ||
    !Array.isArray(candidate.comparisonResultSnapshots) ||
    !isRecord(candidate.baselineSnapshot) ||
    !safeId(candidate.baselineSnapshot.scenarioId) ||
    !isRecord(candidate.unmitigatedSnapshot) ||
    !safeId(candidate.unmitigatedSnapshot.scenarioId)
  )
    return invalid("Malformed brief comparison snapshots.");
  const results = candidate.comparisonResultSnapshots;
  if (
    results.length !== candidate.comparisonOptionSnapshots.length ||
    results.some(
      (r) =>
        !isRecord(r) || !safeId(r.recoveryOptionId) || !safeId(r.scenarioId),
    ) ||
    new Set(results.map((r) => r.recoveryOptionId)).size !== results.length
  )
    return invalid("Brief result identities are invalid.");
  const source: ComparisonRequest = {
    baseline: document.baselineVersions[candidate.baselineVersion],
    incident: document.incidents[candidate.incidentId],
    currency: document.currency,
    limits: document.limits,
    alternatives:
      candidate.comparisonOptionSnapshots as readonly RecoveryOption[],
    scenarioIds: {
      baseline: candidate.baselineSnapshot.scenarioId,
      incident: candidate.unmitigatedSnapshot.scenarioId,
      recoveries: Object.fromEntries(
        results.map((r) => [r.recoveryOptionId, r.scenarioId]),
      ),
    },
  };
  const metadata = {
    id: candidate.id,
    authorLabel: candidate.authorLabel,
    createdAt: candidate.createdAt,
    assumptionsAndConstraints: candidate.assumptionsAndConstraints,
    nextActions: candidate.nextActions,
  } as BriefMetadata;
  const rebuilt = buildDecisionBrief(
    source,
    candidate.selectedRecoveryOptionId as string,
    metadata,
  );
  if (!rebuilt.ok) return fail(...engineErrors(rebuilt.errors));
  return same(rebuilt.value, candidate)
    ? success(rebuilt.value)
    : invalid("Stored brief outputs do not match their captured source.");
}
export function validateDocument(input: unknown): AppResult<WorkspaceDocument> {
  if (
    isRecord(input) &&
    own(input, "schemaVersion") &&
    input.schemaVersion !== 1
  )
    return fail(
      appError(
        "UNSUPPORTED_SCHEMA",
        "Only application schema version 1 is supported.",
        "/schemaVersion",
      ),
    );
  if (
    !keys(input, [
      "schemaVersion",
      "namespace",
      "currency",
      "limits",
      "storageRevision",
      "nextSequence",
      "currentBaselineVersion",
      "baselineVersions",
      "activeIncidentId",
      "incidents",
      "recoveryOptions",
      "selectedOptionByIncident",
      "decisionBriefs",
      "editing",
    ])
  )
    return invalid("Workspace envelope fields are missing or unsupported.");
  if (
    !["demo", "workspace"].includes(String(input.namespace)) ||
    !safeId(input.storageRevision) ||
    !Number.isSafeInteger(input.nextSequence) ||
    (input.nextSequence as number) < 1 ||
    (input.nextSequence as number) >= Number.MAX_SAFE_INTEGER - 1
  )
    return invalid("Invalid namespace, storage token or sequence.");
  if (!same(input.limits, DEFAULT_LIMITS))
    return invalid(
      "This application version uses the frozen default engine limits.",
      "/limits",
    );
  const currency = parseRecoveryCost(
    { kind: "not_entered" },
    input.currency as string,
  );
  if (!currency.ok) return fail(...engineErrors(currency.errors));
  if (
    !record(input.baselineVersions) ||
    !record(input.incidents) ||
    !record(input.recoveryOptions) ||
    !record(input.selectedOptionByIncident) ||
    !Array.isArray(input.decisionBriefs) ||
    !isRecord(input.editing)
  )
    return invalid("Malformed workspace collections.");
  const draft = validateBaseline(input.editing.baseline, "draft");
  if (!draft.ok) return fail(...engineErrors(draft.errors));
  const eventId = draft.value.event.id;
  for (const [version, candidate] of Object.entries(input.baselineVersions)) {
    const checked = calculate({
      kind: "baseline",
      baseline: candidate as BaselineSnapshot,
      currency: input.currency as string,
      limits: DEFAULT_LIMITS,
      scenarioId: "validate-baseline",
    });
    if (!checked.ok) return fail(...engineErrors(checked.errors));
    const baseline = candidate as BaselineSnapshot;
    if (baseline.baselineVersion !== version || baseline.event.id !== eventId)
      return invalid("Baseline key or event identity is inconsistent.");
  }
  if (
    input.currentBaselineVersion !== null &&
    (!safeId(input.currentBaselineVersion) ||
      !own(input.baselineVersions, input.currentBaselineVersion))
  )
    return invalid(
      "Active baseline does not exist.",
      "/currentBaselineVersion",
    );
  for (const [id, candidate] of Object.entries(input.incidents)) {
    if (
      !isRecord(candidate) ||
      candidate.id !== id ||
      !safeId(candidate.baselineVersion) ||
      !own(input.baselineVersions, candidate.baselineVersion)
    )
      return invalid("Incident has a missing baseline or inconsistent ID.");
    const checked = calculate({
      kind: "incident",
      baseline: input.baselineVersions[
        candidate.baselineVersion
      ] as BaselineSnapshot,
      incident: candidate as unknown as Incident,
      currency: input.currency as string,
      limits: DEFAULT_LIMITS,
      scenarioId: "validate-incident",
    });
    if (!checked.ok) return fail(...engineErrors(checked.errors));
  }
  if (input.activeIncidentId !== null) {
    if (
      !safeId(input.activeIncidentId) ||
      !own(input.incidents, input.activeIncidentId)
    )
      return invalid("Active incident is missing.");
    const active = input.incidents[input.activeIncidentId] as Incident;
    if (active.baselineVersion !== input.currentBaselineVersion)
      return invalid("Active incident is stale relative to current baseline.");
  }
  for (const [id, candidate] of Object.entries(input.recoveryOptions)) {
    if (
      !isRecord(candidate) ||
      candidate.id !== id ||
      !safeId(candidate.incidentId) ||
      !own(input.incidents, candidate.incidentId)
    )
      return invalid(
        "Recovery refers to a missing incident or inconsistent ID.",
      );
    const incident = input.incidents[candidate.incidentId] as Incident;
    const option = candidate as unknown as RecoveryOption;
    if (!confirmed(option))
      return fail(
        appError(
          "APPROVAL_CONTEXT_REQUIRED",
          "Confirmed records require external context.",
        ),
      );
    const checked = calculate({
      kind: "recovery",
      baseline: input.baselineVersions[
        incident.baselineVersion
      ] as BaselineSnapshot,
      incident,
      recovery: option,
      currency: input.currency as string,
      limits: DEFAULT_LIMITS,
      scenarioId: "validate-recovery",
    });
    if (!checked.ok) return fail(...engineErrors(checked.errors));
    const selected = input.selectedOptionByIncident[incident.id];
    if ((selected === id) !== (option.status === "selected"))
      return invalid("Option status and explicit preference disagree.");
  }
  for (const [incidentId, optionId] of Object.entries(
    input.selectedOptionByIncident,
  )) {
    if (
      !own(input.incidents, incidentId) ||
      !safeId(optionId) ||
      !own(input.recoveryOptions, optionId) ||
      (input.recoveryOptions[optionId] as RecoveryOption).incidentId !==
        incidentId
    )
      return invalid(
        "Selection refers to a missing or different incident option.",
      );
  }
  const document = input as unknown as WorkspaceDocument;
  for (const incident of Object.values(document.incidents))
    if (optionsOf(document, incident.id).length > 3)
      return invalid("Too many alternatives for an incident.");
  const editing = validateEditing(input.editing, document);
  if (!editing.ok) return editing;
  const ids = new Set<string>();
  for (const candidate of input.decisionBriefs) {
    const checked = validateBrief(candidate, document);
    if (!checked.ok) return checked;
    if (ids.has(checked.value.id)) return invalid("Duplicate brief ID.");
    ids.add(checked.value.id);
  }
  return success(structuredClone(document));
}
export function persistable(
  state: import("./types").ApplicationState,
): AppResult<WorkspaceDocument> {
  if (!state.document || !state.editing)
    return fail(appError("NOT_READY", "No workspace to save."));
  return validateDocument({ ...state.document, editing: state.editing });
}
export { baselineOf };
