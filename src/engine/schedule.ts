import type {
  Activity,
  ActivityTiming,
  BaselineSnapshot,
  CausalExplanation,
  Dependency,
  EngineLimits,
  Id,
  Incident,
  RecoveryModification,
} from "../domain/types";
import type { GraphData } from "./graph";
import { error, failure, success, type Result } from "./errors";

interface EffectiveActivity {
  readonly activity: Activity;
  readonly earliestStartMinute: number;
  readonly durationMinutes: number;
}
export interface ScheduleOutput {
  readonly timings: Readonly<Record<Id, ActivityTiming>>;
  readonly explanations: readonly CausalExplanation[];
}

const ordinal = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

export const applyIncidentAnchor = (
  activities: readonly Activity[],
  baselineTimings: Readonly<Record<Id, ActivityTiming>>,
  targetId: Id,
  delay: number,
): Map<Id, EffectiveActivity> => {
  const effective = new Map<Id, EffectiveActivity>();
  for (const activity of activities)
    effective.set(activity.id, {
      activity,
      earliestStartMinute:
        activity.id === targetId
          ? baselineTimings[targetId].startMinute + delay
          : activity.earliestStartMinute,
      durationMinutes: activity.durationMinutes,
    });
  return effective;
};

export const applyModifications = (
  effective: Map<Id, EffectiveActivity>,
  modifications: readonly RecoveryModification[],
): Map<Id, EffectiveActivity> => {
  const next = new Map(effective);
  for (const modification of modifications) {
    const current = next.get(modification.activityId) as EffectiveActivity;
    const value =
      modification.operation === "set"
        ? modification.valueMinutes
        : (modification.field === "earliest_start"
            ? current.earliestStartMinute
            : current.durationMinutes) + modification.valueMinutes;
    next.set(modification.activityId, {
      ...current,
      ...(modification.field === "earliest_start"
        ? { earliestStartMinute: value }
        : { durationMinutes: value }),
    });
  }
  return next;
};

const bindingEdges = (
  activityId: Id,
  deps: readonly Dependency[],
  timings: Readonly<Record<Id, ActivityTiming>>,
): Dependency[] =>
  deps
    .filter(
      (dependency) =>
        timings[dependency.predecessorId].finishMinute +
          dependency.lagMinutes ===
        timings[activityId].startMinute,
    )
    .sort((a, b) => ordinal(a.id, b.id));

export const schedule = (
  baseline: BaselineSnapshot,
  graph: GraphData,
  effective: Map<Id, EffectiveActivity>,
  limits: EngineLimits,
  directChanges: Readonly<
    Record<Id, { start: boolean; duration: boolean }>
  > = {},
  baselineTimings?: Readonly<Record<Id, ActivityTiming>>,
  incident?: Incident,
): Result<ScheduleOutput> => {
  const timings: Record<Id, ActivityTiming> = Object.create(null) as Record<
    Id,
    ActivityTiming
  >;
  for (const id of graph.topologicalOrder) {
    const current = effective.get(id) as EffectiveActivity;
    const predecessors = graph.dependenciesBySuccessor[id];
    let start = current.earliestStartMinute;
    for (const dependency of predecessors) {
      const predecessor = timings[dependency.predecessorId];
      const candidate = predecessor.finishMinute + dependency.lagMinutes;
      if (!Number.isSafeInteger(candidate))
        return failure(
          error(
            "OVERFLOW",
            `/baseline/dependencies/${baseline.dependencies.indexOf(dependency)}/lagMinutes`,
            "Dependency arithmetic exceeded safe integers.",
            dependency.id,
          ),
        );
      if (candidate > limits.maxMinute)
        return failure(
          error(
            "OUT_OF_RANGE",
            `/baseline/dependencies/${baseline.dependencies.indexOf(dependency)}/lagMinutes`,
            "Dependency candidate exceeds the configured horizon.",
            dependency.id,
          ),
        );
      start = Math.max(start, candidate);
    }
    const finish = start + current.durationMinutes;
    if (!Number.isSafeInteger(finish))
      return failure(
        error(
          "OVERFLOW",
          `/baseline/activities/${baseline.activities.indexOf(current.activity)}/durationMinutes`,
          "Schedule finish exceeded safe integers.",
          id,
        ),
      );
    if (start < 0 || finish < start || finish > limits.maxMinute)
      return failure(
        error(
          "OUT_OF_RANGE",
          `/baseline/activities/${baseline.activities.indexOf(current.activity)}/durationMinutes`,
          "Schedule finish exceeded the configured horizon.",
          id,
        ),
      );
    timings[id] = { startMinute: start, finishMinute: finish };
  }

  const original = baselineTimings ?? timings;
  type Cause = "incident" | "recovery";
  const startCauses = new Map<Id, Set<Cause>>();
  const finishCauses = new Map<Id, Set<Cause>>();
  const scenarioBindings = new Map(
    graph.topologicalOrder.map((id) => [
      id,
      bindingEdges(id, graph.dependenciesBySuccessor[id], timings),
    ]),
  );
  const baselineBindings = new Map(
    graph.topologicalOrder.map((id) => [
      id,
      bindingEdges(id, graph.dependenciesBySuccessor[id], original),
    ]),
  );
  for (const id of graph.topologicalOrder) {
    const current = effective.get(id)!;
    const causes = new Set<Cause>();
    const start = timings[id].startMinute,
      before = original[id].startMinute;
    if (start > before) {
      for (const edge of scenarioBindings.get(id)!) {
        if (
          timings[edge.predecessorId].finishMinute + edge.lagMinutes >
          before
        ) {
          for (const cause of finishCauses.get(edge.predecessorId)!)
            causes.add(cause);
        }
      }
      if (
        incident &&
        incident.targetActivityId === id &&
        incident.startDelayMinutes > 0 &&
        current.earliestStartMinute > before &&
        current.earliestStartMinute === start
      )
        causes.add("incident");
      if (directChanges[id]?.start && current.earliestStartMinute === start)
        causes.add("recovery");
    } else if (start < before) {
      for (const edge of baselineBindings.get(id)!) {
        if (
          timings[edge.predecessorId].finishMinute <
          original[edge.predecessorId].finishMinute
        ) {
          for (const cause of finishCauses.get(edge.predecessorId)!)
            causes.add(cause);
        }
      }
      if (
        directChanges[id]?.start &&
        current.activity.earliestStartMinute === before &&
        current.earliestStartMinute < before
      )
        causes.add("recovery");
    }
    startCauses.set(id, causes);
    const finish = new Set(causes);
    if (current.durationMinutes !== current.activity.durationMinutes)
      finish.add("recovery");
    finishCauses.set(
      id,
      timings[id].finishMinute === original[id].finishMinute
        ? new Set()
        : finish,
    );
  }

  const explanations: CausalExplanation[] = [...baseline.activities]
    .sort((a, b) => ordinal(a.id, b.id))
    .map((activity) => {
      const id = activity.id,
        current = effective.get(id)!;
      const edges = new Map<string, CausalExplanation["causeEdges"][number]>();
      const visited = new Set<string>();
      const stack: { id: Id; context: "baseline" | "scenario" }[] = [
        { id, context: "scenario" },
      ];
      while (stack.length) {
        const node = stack.pop()!;
        const key = JSON.stringify([node.context, node.id]);
        if (visited.has(key)) continue;
        visited.add(key);
        if (
          node.context === "scenario" &&
          timings[node.id].startMinute < original[node.id].startMinute
        )
          stack.push({ id: node.id, context: "baseline" });
        const source = node.context === "scenario" ? timings : original;
        const bindings =
          node.context === "scenario" ? scenarioBindings : baselineBindings;
        for (const dependency of bindings.get(node.id)!) {
          edges.set(JSON.stringify([node.context, dependency.id]), {
            constraintContext: node.context,
            predecessorId: dependency.predecessorId,
            successorId: dependency.successorId,
            dependencyId: dependency.id,
            predecessorFinishMinute:
              source[dependency.predecessorId].finishMinute,
            lagMinutes: dependency.lagMinutes,
            candidateStartMinute:
              source[dependency.predecessorId].finishMinute +
              dependency.lagMinutes,
          });
          stack.push({ id: dependency.predecessorId, context: node.context });
        }
      }
      const allEdges = [...edges.values()].sort(
        (a, b) =>
          ordinal(a.constraintContext, b.constraintContext) ||
          ordinal(a.dependencyId, b.dependencyId),
      );
      return {
        activityId: id,
        bindingEarliestStart:
          current.earliestStartMinute === timings[id].startMinute,
        bindingDependencyIds: scenarioBindings.get(id)!.map((d) => d.id),
        baselineBindingDependencyIds: baselineBindings
          .get(id)!
          .map((d) => d.id),
        startChangedDirectly:
          current.earliestStartMinute !== activity.earliestStartMinute,
        durationChangedDirectly:
          current.durationMinutes !== activity.durationMinutes,
        incidentReachable: false,
        startCauseKinds: [...startCauses.get(id)!].sort(),
        finishCauseKinds: [...finishCauses.get(id)!].sort(),
        causeEdges: allEdges.slice(0, limits.maxCauseEdges),
        truncated: allEdges.length > limits.maxCauseEdges,
      };
    });
  return success({ timings, explanations });
};
