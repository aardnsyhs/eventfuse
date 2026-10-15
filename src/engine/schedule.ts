import type { Activity, ActivityTiming, BaselineSnapshot, CausalExplanation, Dependency, EngineLimits, Id, RecoveryModification } from '../domain/types'
import type { GraphData } from './graph'
import { error, failure, success, type Result } from './errors'

interface EffectiveActivity { readonly activity: Activity; readonly earliestStartMinute: number; readonly durationMinutes: number }
export interface ScheduleOutput {
  readonly timings: Readonly<Record<Id, ActivityTiming>>
  readonly explanations: readonly CausalExplanation[]
}

const ordinal = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0

export const applyIncidentAnchor = (activities: readonly Activity[], baselineTimings: Readonly<Record<Id, ActivityTiming>>, targetId: Id, delay: number): Map<Id, EffectiveActivity> => {
  const effective = new Map<Id, EffectiveActivity>()
  for (const activity of activities) effective.set(activity.id, { activity, earliestStartMinute: activity.id === targetId ? baselineTimings[targetId].startMinute + delay : activity.earliestStartMinute, durationMinutes: activity.durationMinutes })
  return effective
}

export const applyModifications = (effective: Map<Id, EffectiveActivity>, modifications: readonly RecoveryModification[]): Map<Id, EffectiveActivity> => {
  const next = new Map(effective)
  for (const modification of modifications) {
    const current = next.get(modification.activityId) as EffectiveActivity
    const value = modification.operation === 'set' ? modification.valueMinutes : (modification.field === 'earliest_start' ? current.earliestStartMinute : current.durationMinutes) + modification.valueMinutes
    next.set(modification.activityId, { ...current, ...(modification.field === 'earliest_start' ? { earliestStartMinute: value } : { durationMinutes: value }) })
  }
  return next
}

const bindingEdges = (activityId: Id, deps: readonly Dependency[], timings: Readonly<Record<Id, ActivityTiming>>): Dependency[] => deps.filter((dependency) => timings[dependency.predecessorId].finishMinute + dependency.lagMinutes === timings[activityId].startMinute).sort((a, b) => ordinal(a.id, b.id))

export const schedule = (baseline: BaselineSnapshot, graph: GraphData, effective: Map<Id, EffectiveActivity>, limits: EngineLimits, directChanges: Readonly<Record<Id, { start: boolean; duration: boolean }>> = {}): Result<ScheduleOutput> => {
  const timings: Record<Id, ActivityTiming> = Object.create(null) as Record<Id, ActivityTiming>
  for (const id of graph.topologicalOrder) {
    const current = effective.get(id) as EffectiveActivity
    const predecessors = graph.dependenciesBySuccessor[id]
    let start = current.earliestStartMinute
    for (const dependency of predecessors) {
      const predecessor = timings[dependency.predecessorId]
      const candidate = predecessor.finishMinute + dependency.lagMinutes
      if (!Number.isSafeInteger(candidate) || candidate > limits.maxMinute) return failure(error('OVERFLOW', `/activities/${id}`, 'Schedule arithmetic exceeded configured limits.', id, [dependency.id]))
      start = Math.max(start, candidate)
    }
    const finish = start + current.durationMinutes
    if (!Number.isSafeInteger(finish) || start < 0 || finish < start || finish > limits.maxMinute) return failure(error('OVERFLOW', `/activities/${id}`, 'Schedule finish exceeded configured limits.', id))
    timings[id] = { startMinute: start, finishMinute: finish }
  }

  const explanations: CausalExplanation[] = baseline.activities.map((activity) => {
    const scenarioBindings = bindingEdges(activity.id, graph.dependenciesBySuccessor[activity.id], timings)
    const scenario = effective.get(activity.id) as EffectiveActivity
    const direct = directChanges[activity.id] ?? { start: false, duration: false }
    const causeEdges = scenarioBindings.slice(0, limits.maxCauseEdges).map((dependency) => ({ constraintContext: 'scenario' as const, predecessorId: dependency.predecessorId, successorId: dependency.successorId, dependencyId: dependency.id, predecessorFinishMinute: timings[dependency.predecessorId].finishMinute, lagMinutes: dependency.lagMinutes, candidateStartMinute: timings[dependency.predecessorId].finishMinute + dependency.lagMinutes }))
    const truncated = scenarioBindings.length > limits.maxCauseEdges
    return { activityId: activity.id, bindingEarliestStart: scenario.earliestStartMinute === timings[activity.id].startMinute, bindingDependencyIds: scenarioBindings.map((dependency) => dependency.id), baselineBindingDependencyIds: [], startChangedDirectly: direct.start, durationChangedDirectly: direct.duration, incidentReachable: false, startCauseKinds: direct.start ? ['recovery'] : [], finishCauseKinds: direct.duration ? ['recovery'] : [], causeEdges, truncated }
  })
  return success({ timings, explanations })
}
