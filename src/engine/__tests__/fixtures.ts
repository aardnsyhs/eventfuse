import raw from "../../../docs/engineering-preparation/GOLDEN_TEST_FIXTURES.json";
import type { ComparisonRequest, EngineRequest } from "../../domain/engine-api";
import type {
  BriefMetadata,
  RecoveryCostDraft,
  ScenarioResult,
} from "../../domain/types";
import type { ValidationError } from "../errors";

type ErrorProjection = Omit<ValidationError, "message">;
interface GoldenCase {
  id: string;
  request: EngineRequest;
  expected: {
    ok: boolean;
    projection?: Record<string, unknown>;
    errors?: ErrorProjection[];
  };
}
interface ComparisonGroup {
  id: string;
  baselineCaseId: string;
  incidentCaseId: string;
  recoveryCaseIds: string[];
  expected: unknown[];
}
export const fixtures = raw as unknown as {
  cases: GoldenCase[];
  comparisonGroups: ComparisonGroup[];
  costInputCases: {
    id: string;
    currency: string;
    costDraft: RecoveryCostDraft;
    expected: {
      ok: boolean;
      value?: number | null;
      errors?: ErrorProjection[];
    };
  }[];
  briefCases: {
    id: string;
    comparisonGroupId: string;
    selectRecoveryOptionId: string;
    metadata: BriefMetadata;
    expected: Record<string, unknown>;
  }[];
};
export const fixtureCase = (id: string): GoldenCase => {
  const found = fixtures.cases.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown fixture ${id}`);
  return structuredClone(found);
};
export function comparisonRequest(group: ComparisonGroup): ComparisonRequest {
  const incident = fixtureCase(group.incidentCaseId).request;
  if (incident.kind !== "incident")
    throw new Error("Expected incident fixture");
  const recoveries = group.recoveryCaseIds.map((id) => fixtureCase(id).request);
  return {
    baseline: incident.baseline,
    incident: incident.incident,
    currency: incident.currency,
    limits: incident.limits,
    scenarioIds: {
      baseline: group.baselineCaseId,
      incident: group.incidentCaseId,
      recoveries: Object.fromEntries(
        recoveries.map((r) => {
          if (r.kind !== "recovery")
            throw new Error("Expected recovery fixture");
          return [r.recovery.id, r.scenarioId];
        }),
      ),
    },
    alternatives: recoveries.map((r) => {
      if (r.kind !== "recovery") throw new Error("Expected recovery fixture");
      return r.recovery;
    }),
  };
}
export const projectErrors = (errors: readonly ValidationError[]) =>
  errors.map(({ code, path, entityId, relatedIds }) => ({
    code,
    path,
    entityId,
    relatedIds,
  }));
export function projectScenario(
  result: ScenarioResult,
  expected: Record<string, unknown>,
): Record<string, unknown> {
  const projection: Record<string, unknown> = {};
  for (const key of Object.keys(expected)) {
    if (key === "activityTimings")
      projection[key] = Object.fromEntries(
        Object.entries(result.activityTimings).map(([id, t]) => [
          id,
          [t.startMinute, t.finishMinute],
        ]),
      );
    else if (key === "affectedMilestoneIds")
      projection[key] = result.affectedMilestones.map((m) => m.milestoneId);
    else if (key === "deadlineBreachIds")
      projection[key] = result.deadlineBreaches.map((m) => m.milestoneId);
    else if (key === "warningCodes")
      projection[key] = [
        ...new Set(result.validationWarnings.map((w) => w.code)),
      ].sort();
    else if (key === "bindings")
      projection[key] = Object.fromEntries(
        Object.keys(expected.bindings as object).map((id) => {
          const explanation = result.explanationPaths.find(
            (e) => e.activityId === id,
          );
          return [
            id,
            explanation && {
              bindingDependencyIds: explanation.bindingDependencyIds,
              bindingEarliestStart: explanation.bindingEarliestStart,
            },
          ];
        }),
      );
    else projection[key] = result[key as keyof ScenarioResult];
  }
  return projection;
}
export function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

export type Mutable<T> = T extends readonly (infer E)[]
  ? Mutable<E>[]
  : T extends object
    ? { -readonly [K in keyof T]: Mutable<T[K]> }
    : T;
export function mutableRequest(
  id = "vendor-delay-deadline-breach",
): Mutable<EngineRequest> {
  return fixtureCase(id).request as Mutable<EngineRequest>;
}
export function recoveryRequest(
  id = "figma-option-a-unknown-cost",
): Mutable<Extract<EngineRequest, { kind: "recovery" }>> {
  const request = mutableRequest(id);
  if (request.kind !== "recovery") throw new Error("Expected recovery request");
  return request;
}
export function generatedDag(
  size: number,
  seed: number,
): Mutable<Extract<EngineRequest, { kind: "baseline" }>> {
  const request = mutableRequest("corporate-launch-baseline");
  if (request.kind !== "baseline") throw new Error("Expected baseline request");
  let state = seed;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
  request.baseline.activities = Array.from({ length: size }, (_, i) => ({
    ...request.baseline.activities[0],
    id: `a${String(i).padStart(3, "0")}`,
    earliestStartMinute: Math.floor(random() * 120),
    durationMinutes: Math.floor(random() * 31),
  }));
  request.baseline.dependencies = [];
  for (let i = 1; i < size; i++) {
    let incoming = 0;
    for (let j = i - 1; j >= 0 && incoming < 3; j--)
      if (random() < 0.2) {
        request.baseline.dependencies.push({
          id: `e${j}-${i}`,
          eventId: request.baseline.event.id,
          predecessorId: request.baseline.activities[j].id,
          successorId: request.baseline.activities[i].id,
          type: "finish_to_start",
          lagMinutes: Math.floor(random() * 6),
        });
        incoming++;
      }
  }
  request.baseline.milestones = [
    {
      ...request.baseline.milestones[0],
      activityId: request.baseline.activities.at(-1)!.id,
      deadlineMinute: 1000,
    },
  ];
  return request;
}
