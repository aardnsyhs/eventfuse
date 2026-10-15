import {
  buildDecisionBrief,
  calculate,
  compareRecoveries,
  DEFAULT_LIMITS,
  parseRecoveryCost,
  validateBaseline,
} from "../engine/index";
import type {
  BaselineSnapshot,
  DecisionBrief,
  Incident,
  Result,
} from "../engine/index";
import type {
  ApplicationState,
  AppError,
  Command,
  CommandResult,
  WorkspaceDocument,
} from "./types";
import { appError, engineErrors, freeze, own, safeId } from "./common";
import {
  baselineDirty,
  baselineOf,
  comparisonSource,
  current,
  incidentDirty,
  incidentDraftOf,
  incidentOf,
  optionsOf,
  recoveryDirty,
} from "./context";
import { validateDocument } from "./validation";

export const emptyCalculation = (): ApplicationState["calculation"] => ({
  status: "empty",
  baseline: null,
  incident: null,
  comparison: null,
});
export const emptyState = (): ApplicationState =>
  freeze({
    document: null,
    editing: null,
    generation: 0,
    baselineValidation: "unknown",
    calculation: emptyCalculation(),
    persistence: { status: "idle", expectedRevision: null, error: null },
    errors: [],
  });
type Mutable<T> = T extends readonly (infer U)[]
  ? Mutable<U>[]
  : T extends object
    ? { -readonly [K in keyof T]: Mutable<T[K]> }
    : T;
const clone = <T>(value: T): Mutable<T> => structuredClone(value) as Mutable<T>;
const reject = (
  state: ApplicationState,
  errors: readonly AppError[],
  invalid = false,
  baselineInvalid = false,
): CommandResult => ({
  ok: false,
  errors,
  state: freeze({
    ...state,
    errors,
    calculation: invalid
      ? { ...emptyCalculation(), status: "invalid" }
      : state.calculation,
    baselineValidation: baselineInvalid ? "invalid" : state.baselineValidation,
  }),
});
function allocate(d: Mutable<WorkspaceDocument>, prefix: string): string {
  let id: string;
  do {
    if (d.nextSequence >= Number.MAX_SAFE_INTEGER - 1)
      throw new RangeError("Document ID sequence exhausted");
    id = `${prefix}-${d.nextSequence++}`;
  } while (
    own(d.baselineVersions, id) ||
    own(d.incidents, id) ||
    own(d.recoveryOptions, id) ||
    own(d.editing.recoveries, id) ||
    d.decisionBriefs.some((b) => b.id === id)
  );
  return id;
}
export function execute(
  state: ApplicationState,
  command: Command,
): CommandResult {
  try {
    return transition(state, command);
  } catch (cause) {
    if (
      cause instanceof RangeError &&
      cause.message === "Document ID sequence exhausted"
    )
      return reject(state, [appError("INVALID_INPUT", cause.message)]);
    throw cause;
  }
}
function transition(state: ApplicationState, command: Command): CommandResult {
  const s = clone(state) as Omit<Mutable<ApplicationState>, "calculation"> & {
    calculation: {
      -readonly [K in keyof ApplicationState["calculation"]]: ApplicationState["calculation"][K];
    };
  };
  const finish = (brief?: DecisionBrief): CommandResult => {
    s.generation++;
    s.errors = [];
    if (s.document)
      s.persistence = {
        ...s.persistence,
        status: s.persistence.status === "saving" ? "saving" : "unsaved",
        error: null,
      };
    return { ok: true, state: freeze(s), ...(brief ? { brief } : {}) };
  };
  const failure = (message: string, code: AppError["code"] = "NOT_READY") =>
    reject(state, [appError(code, message)]);
  const fromEngine = (r: Result<unknown>) =>
    !r.ok
      ? reject(
          state,
          engineErrors(r.errors),
          true,
          ["baseline.validate", "baseline.apply"].includes(command.type),
        )
      : failure("Unexpected successful validation");
  const dirty = () => {
    s.calculation = { ...emptyCalculation(), status: "dirty" };
    s.baselineValidation = "unknown";
  };
  if (command.type === "event.create") {
    if (s.document)
      return failure(
        "Use a separate workspace controller to create another event.",
        "ID_EXISTS",
      );
    const baseline: BaselineSnapshot = {
      baselineVersion: "draft",
      event: command.event,
      activities: [],
      dependencies: [],
      milestones: [],
    };
    const valid = validateBaseline(baseline, "draft");
    if (!valid.ok) return fromEngine(valid);
    const currency = parseRecoveryCost(
      { kind: "not_entered" },
      command.currency,
    );
    if (!currency.ok) return fromEngine(currency);
    if (
      command.namespace !== undefined &&
      !["demo", "workspace"].includes(command.namespace)
    )
      return failure("Unknown workspace namespace.", "INVALID_INPUT");
    const editing = { baseline: valid.value, incident: null, recoveries: {} };
    s.document = clone({
      schemaVersion: 1,
      namespace: command.namespace ?? "workspace",
      currency: command.currency,
      limits: { ...DEFAULT_LIMITS },
      storageRevision: "unsaved",
      nextSequence: 1,
      currentBaselineVersion: null,
      baselineVersions: {},
      activeIncidentId: null,
      incidents: {},
      recoveryOptions: {},
      selectedOptionByIncident: {},
      decisionBriefs: [],
      editing,
    }) as Mutable<WorkspaceDocument>;
    s.editing = clone(editing) as Mutable<ApplicationState["editing"]>;
    return finish();
  }
  if (!s.document || !s.editing)
    return failure("Create or load an event first.");
  const d = s.document,
    e = s.editing;
  const baseline = baselineOf(d),
    incident = incidentOf(d);
  const staleIncident = (id: string): CommandResult | null =>
    !incident ||
    id !== incident.id ||
    incident.baselineVersion !== d.currentBaselineVersion
      ? failure("Incident context is stale.", "STALE_CONTEXT")
      : baselineDirty(state) ||
          (command.type !== "incident.reset" && incidentDirty(state))
        ? failure("Apply or restore the source drafts first.")
        : null;
  const clearSelection = () => {
    if (!incident) return;
    delete d.selectedOptionByIncident[incident.id];
    for (const o of Object.values(d.recoveryOptions))
      if (o.incidentId === incident.id) o.status = "draft";
    for (const o of Object.values(e.recoveries))
      if (o.incidentId === incident.id) o.status = "draft";
    s.calculation.comparison = null;
  };
  if ("expectedIncidentId" in command) {
    const invalid = staleIncident(command.expectedIncidentId);
    if (invalid) return invalid;
  }
  switch (command.type) {
    case "event.edit":
      if (
        "id" in command.patch ||
        "schemaVersion" in command.patch ||
        "createdAt" in command.patch
      )
        return failure("Event identity cannot change.", "INVALID_INPUT");
      e.baseline.event = { ...e.baseline.event, ...clone(command.patch) };
      dirty();
      return finish();
    case "activity.put":
    case "dependency.put":
    case "milestone.put": {
      const item =
        command.type === "activity.put"
          ? command.activity
          : command.type === "dependency.put"
            ? command.dependency
            : command.milestone;
      if (!safeId(item.id) || item.eventId !== e.baseline.event.id)
        return failure(
          "Entity must have a valid ID and belong to this event.",
          "INVALID_INPUT",
        );
      if (command.type === "activity.put")
        e.baseline.activities = [
          ...e.baseline.activities.filter((a) => a.id !== item.id),
          clone(command.activity),
        ];
      else if (command.type === "dependency.put")
        e.baseline.dependencies = [
          ...e.baseline.dependencies.filter((a) => a.id !== item.id),
          clone(command.dependency),
        ];
      else if (command.type === "milestone.put")
        e.baseline.milestones = [
          ...e.baseline.milestones.filter((a) => a.id !== item.id),
          clone(command.milestone),
        ];
      dirty();
      return finish();
    }
    case "activity.remove": {
      if (!e.baseline.activities.some((a) => a.id === command.id))
        return failure("Activity not found.", "NOT_FOUND");
      const affected = e.baseline.milestones.filter(
        (m) => m.activityId === command.id,
      );
      if (affected.length && !command.milestoneReplacements)
        return failure(
          "Explicitly reconcile milestones before deleting this activity.",
          "MILESTONE_RECONCILIATION_REQUIRED",
        );
      const replacements = command.milestoneReplacements ?? [];
      if (
        replacements.some(
          (m) =>
            !affected.some((a) => a.id === m.id) ||
            m.activityId === command.id ||
            m.eventId !== e.baseline.event.id ||
            !e.baseline.activities.some((a) => a.id === m.activityId),
        ) ||
        new Set(replacements.map((m) => m.id)).size !== replacements.length
      )
        return failure(
          "Milestone replacements must reference remaining activities.",
          "INVALID_INPUT",
        );
      e.baseline.activities = e.baseline.activities.filter(
        (a) => a.id !== command.id,
      );
      e.baseline.dependencies = e.baseline.dependencies.filter(
        (a) => a.predecessorId !== command.id && a.successorId !== command.id,
      );
      e.baseline.milestones = [
        ...e.baseline.milestones.filter(
          (m) => !affected.some((a) => a.id === m.id),
        ),
        ...clone(replacements),
      ];
      dirty();
      return finish();
    }
    case "dependency.remove":
    case "milestone.remove": {
      const key =
        command.type === "dependency.remove" ? "dependencies" : "milestones";
      if (!e.baseline[key].some((a) => a.id === command.id))
        return failure("Entity not found.", "NOT_FOUND");
      if (key === "dependencies")
        e.baseline.dependencies = e.baseline.dependencies.filter(
          (a) => a.id !== command.id,
        );
      else
        e.baseline.milestones = e.baseline.milestones.filter(
          (a) => a.id !== command.id,
        );
      dirty();
      return finish();
    }
    case "baseline.validate": {
      const valid = validateBaseline(e.baseline, "draft");
      if (!valid.ok) return fromEngine(valid);
      s.baselineValidation = "valid";
      s.calculation.status = baselineDirty(state) ? "dirty" : "ready";
      return finish();
    }
    case "baseline.apply": {
      if (command.expectedVersion !== d.currentBaselineVersion)
        return failure(
          "Baseline pointer changed; review the current revision.",
          "STALE_CONTEXT",
        );
      const id = allocate(d, "baseline"),
        snapshot = { ...clone(e.baseline), baselineVersion: id };
      const result = calculate({
        kind: "baseline",
        baseline: snapshot,
        currency: d.currency,
        limits: d.limits,
        scenarioId: `baseline:${id}`,
      });
      if (!result.ok) return fromEngine(result);
      d.baselineVersions[id] = snapshot;
      d.currentBaselineVersion = id;
      d.activeIncidentId = null;
      e.baseline = clone(snapshot);
      e.incident = null;
      e.recoveries = {};
      d.editing = clone(e);
      s.baselineValidation = "valid";
      s.calculation = {
        status: "ready",
        baseline: result.value,
        incident: null,
        comparison: null,
      };
      return finish();
    }
    case "baseline.restoreDraft": {
      if (!own(d.baselineVersions, command.version))
        return failure("Baseline revision not found.", "NOT_FOUND");
      e.baseline = clone(d.baselineVersions[command.version]);
      dirty();
      return finish();
    }
    case "incident.configure":
      if (
        !baseline ||
        command.draft.baselineVersion !== d.currentBaselineVersion
      )
        return failure(
          "Choose the current baseline revision.",
          "STALE_CONTEXT",
        );
      e.incident = clone(command.draft);
      dirty();
      return finish();
    case "incident.apply": {
      if (!baseline || baselineDirty(state))
        return failure("Apply a valid baseline first.");
      if (
        !e.incident ||
        command.expectedVersion !== d.currentBaselineVersion ||
        e.incident.baselineVersion !== command.expectedVersion
      )
        return failure(
          "Incident draft references another baseline.",
          "STALE_CONTEXT",
        );
      const i: Incident = {
        ...clone(e.incident),
        id: allocate(d, "incident"),
        eventId: baseline.event.id,
        createdAt: command.createdAt,
      };
      const result = calculate({
        kind: "incident",
        baseline,
        incident: i,
        limits: d.limits,
        currency: d.currency,
        scenarioId: `incident:${i.id}`,
      });
      if (!result.ok) return fromEngine(result);
      d.incidents[i.id] = i;
      d.activeIncidentId = i.id;
      e.recoveries = {};
      d.editing = clone(e);
      s.calculation = {
        status: "applied",
        baseline: calculateBaseline(d, baseline),
        incident: result.value,
        comparison: null,
      };
      return finish();
    }
    case "incident.reset": {
      if (!command.confirmed)
        return failure(
          "Reset requires explicit confirmation.",
          "UNSAVED_CHANGES",
        );
      const i = {
        ...incident!,
        id: allocate(d, "incident"),
        startDelayMinutes: 0,
        createdAt: command.createdAt,
      };
      const result = calculate({
        kind: "incident",
        baseline: baseline!,
        incident: i,
        limits: d.limits,
        currency: d.currency,
        scenarioId: `incident:${i.id}`,
      });
      if (!result.ok) return fromEngine(result);
      d.incidents[i.id] = i;
      d.activeIncidentId = i.id;
      e.incident = incidentDraftOf(i);
      e.recoveries = {};
      d.editing = clone(e);
      s.calculation = {
        status: "ready",
        baseline: calculateBaseline(d, baseline!),
        incident: result.value,
        comparison: null,
      };
      return finish();
    }
    case "recovery.add": {
      if (
        command.option.approvalStatus === "confirmed" &&
        !command.option.approvalContext?.trim()
      )
        return failure(
          "Record externally verified context before confirming.",
          "APPROVAL_CONTEXT_REQUIRED",
        );
      const ids = new Set([
        ...optionsOf(d).map((o) => o.id),
        ...Object.keys(e.recoveries),
      ]);
      if (ids.size >= 3)
        return failure(
          "At most three active alternatives are supported.",
          "INVALID_INPUT",
        );
      const id = allocate(d, "option");
      e.recoveries[id] = {
        ...clone(command.option),
        id,
        incidentId: incident!.id,
        status: "draft",
      };
      clearSelection();
      dirty();
      return finish();
    }
    case "recovery.edit":
    case "recovery.cost":
    case "recovery.modification.put":
    case "recovery.modification.remove":
    case "recovery.approval": {
      const option = e.recoveries[command.id] ?? d.recoveryOptions[command.id];
      if (!option || option.incidentId !== incident!.id)
        return failure("Option not found in this incident.", "NOT_FOUND");
      let next = clone(option);
      if (command.type === "recovery.edit") {
        if (
          "id" in command.patch ||
          "incidentId" in command.patch ||
          "status" in command.patch
        )
          return failure(
            "Option identity and selection require explicit commands.",
            "INVALID_INPUT",
          );
        if (
          command.patch.currency &&
          command.patch.currency !== next.currency &&
          !("costMinorUnits" in command.patch)
        )
          return failure(
            "Re-enter or explicitly clear the estimate when changing currency.",
            "INVALID_INPUT",
          );
        next = { ...next, ...clone(command.patch) };
      } else if (command.type === "recovery.cost") {
        const cost = parseRecoveryCost(command.draft, d.currency);
        if (!cost.ok) return fromEngine(cost);
        next.costMinorUnits = cost.value;
        next.currency = d.currency;
      } else if (command.type === "recovery.approval") {
        next.approvalStatus = command.approvalStatus;
        next.approvalContext = command.context;
      } else if (command.type === "recovery.modification.put")
        next.modifications = [
          ...next.modifications.filter(
            (m) =>
              !(
                m.activityId === command.modification.activityId &&
                m.field === command.modification.field
              ),
          ),
          clone(command.modification),
        ];
      else
        next.modifications = next.modifications.filter(
          (m) =>
            !(m.activityId === command.activityId && m.field === command.field),
        );
      if (next.approvalStatus === "confirmed" && !next.approvalContext?.trim())
        return failure(
          "Record externally verified context before confirming.",
          "APPROVAL_CONTEXT_REQUIRED",
        );
      clearSelection();
      next.status = "draft";
      e.recoveries[command.id] = next;
      dirty();
      return finish();
    }
    case "recovery.apply": {
      const option = e.recoveries[command.id];
      if (!option || option.incidentId !== incident!.id)
        return failure("Option draft not found.", "NOT_FOUND");
      if (
        option.approvalStatus === "confirmed" &&
        !option.approvalContext?.trim()
      )
        return failure(
          "Confirmed status requires external context.",
          "APPROVAL_CONTEXT_REQUIRED",
        );
      const result = calculate({
        kind: "recovery",
        baseline: baseline!,
        incident: incident!,
        recovery: option,
        currency: d.currency,
        limits: d.limits,
        scenarioId: `recovery:${incident!.id}:${option.id}`,
      });
      if (!result.ok) return fromEngine(result);
      clearSelection();
      d.recoveryOptions[option.id] = { ...clone(option), status: "draft" };
      delete e.recoveries[option.id];
      d.editing = clone(e);
      s.calculation = {
        ...emptyCalculation(),
        status: Object.keys(e.recoveries).length ? "dirty" : "applied",
        baseline: calculateBaseline(d, baseline!),
        incident: calculateIncident(d, baseline!, incident!),
      };
      return finish();
    }
    case "recovery.remove": {
      const option = e.recoveries[command.id] ?? d.recoveryOptions[command.id];
      if (!option || option.incidentId !== incident!.id)
        return failure("Option not found.", "NOT_FOUND");
      clearSelection();
      delete e.recoveries[command.id];
      delete d.recoveryOptions[command.id];
      d.editing = clone(e);
      s.calculation = {
        ...emptyCalculation(),
        status: Object.keys(e.recoveries).length ? "dirty" : "applied",
        baseline: calculateBaseline(d, baseline!),
        incident: calculateIncident(d, baseline!, incident!),
      };
      return finish();
    }
    case "recovery.compare": {
      if (recoveryDirty(state) || !baseline || !incident)
        return failure("Apply option drafts before comparison.");
      const source = comparisonSource(d)!;
      const result = compareRecoveries(source);
      if (!result.ok) return fromEngine(result);
      s.calculation = {
        status: "applied",
        baseline: result.value.baseline,
        incident: result.value.unmitigated,
        comparison: result.value,
      };
      return finish();
    }
    case "selection.set": {
      if (!current(state) || !s.calculation.comparison)
        return failure("Compare current valid options first.");
      const match = s.calculation.comparison.alternatives.find(
        (o) => o.recoveryOptionId === command.id,
      );
      if (!match?.result.ok)
        return failure(
          "Select an option with a valid current result.",
          "NOT_READY",
        );
      if (d.selectedOptionByIncident[incident!.id] === command.id)
        return { ok: true, state };
      clearSelection();
      d.selectedOptionByIncident[incident!.id] = command.id;
      d.recoveryOptions[command.id].status = "selected";
      s.calculation.comparison = clone(state.calculation.comparison);
      return finish();
    }
    case "selection.clear":
      clearSelection();
      return finish();
    case "brief.prepare": {
      if (!current(state) || !s.calculation.comparison)
        return failure(
          "Current valid comparison and explicit preference are required.",
        );
      const id = d.selectedOptionByIncident[incident!.id];
      if (!id) return failure("Select a preferred proposal first.");
      if (d.decisionBriefs.some((b) => b.id === command.metadata.id))
        return failure("Brief ID already exists.", "ID_EXISTS");
      const result = buildDecisionBrief(
        comparisonSource(d)!,
        id,
        command.metadata,
      );
      if (!result.ok) return fromEngine(result);
      d.decisionBriefs.push(clone(result.value));
      return finish(freeze(result.value));
    }
    case "demo.reset": {
      if (!command.confirmed)
        return failure("Confirm demo reset first.", "UNSAVED_CHANGES");
      if (
        d.namespace !== "demo" ||
        command.seed.namespace !== "demo" ||
        command.seed.editing.baseline.event.id !== e.baseline.event.id
      )
        return failure(
          "Demo reset cannot replace a workspace or another event.",
          "INVALID_INPUT",
        );
      const seed = validateDocument(command.seed);
      if (!seed.ok) return reject(state, seed.errors);
      const restored = restoreState(
        { ...seed.value, storageRevision: d.storageRevision },
        state.persistence.expectedRevision,
      );
      return {
        ok: true,
        state: freeze({
          ...restored,
          generation: state.generation + 1,
          persistence: { ...state.persistence, status: "unsaved", error: null },
        }),
      };
    }
    default:
      return failure("Unknown application command.", "INVALID_INPUT");
  }
}
function calculateBaseline(d: WorkspaceDocument, baseline: BaselineSnapshot) {
  const result = calculate({
    kind: "baseline",
    baseline,
    currency: d.currency,
    limits: d.limits,
    scenarioId: `baseline:${baseline.baselineVersion}`,
  });
  return result.ok ? result.value : null;
}
function calculateIncident(
  d: WorkspaceDocument,
  baseline: BaselineSnapshot,
  incident: Incident,
) {
  const result = calculate({
    kind: "incident",
    baseline,
    incident,
    currency: d.currency,
    limits: d.limits,
    scenarioId: `incident:${incident.id}`,
  });
  return result.ok ? result.value : null;
}
export function restoreState(
  document: WorkspaceDocument,
  expectedRevision: string | null = document.storageRevision,
): ApplicationState {
  const d = clone(document),
    baseline = baselineOf(d),
    incident = incidentOf(d);
  let s: ApplicationState = {
    ...emptyState(),
    document: d,
    editing: clone(d.editing),
    persistence: { status: "saved", expectedRevision, error: null },
  };
  const dirty = baselineDirty(s) || incidentDirty(s) || recoveryDirty(s);
  let comparison = null;
  const source = comparisonSource(d);
  if (!dirty && source?.alternatives.length) {
    const result = compareRecoveries(source);
    comparison = result.ok ? result.value : null;
  }
  s = {
    ...s,
    baselineValidation: baseline && !baselineDirty(s) ? "valid" : "unknown",
    calculation: {
      status: dirty
        ? "dirty"
        : incident
          ? incident.startDelayMinutes
            ? "applied"
            : "ready"
          : baseline
            ? "ready"
            : "empty",
      baseline: !dirty && baseline ? calculateBaseline(d, baseline) : null,
      incident:
        !dirty && baseline && incident
          ? calculateIncident(d, baseline, incident)
          : null,
      comparison,
    },
  };
  return freeze(s);
}
