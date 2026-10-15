import type { Activity, BaselineSnapshot, CausalExplanation, EngineLimits, EngineWarning, Incident, MilestoneImpact, RecoveryOption, ScenarioResult } from '../domain/types'
import { validateBaseline, validateCurrency, validateIncident, validateLimits, validateRecoveryOption } from '../domain/validation'
import { validateGraph, type GraphData } from './graph'
import { applyIncidentAnchor, applyModifications, schedule, type ScheduleOutput } from './schedule'
import { error, failure, success, type Result } from './errors'

const ordinal = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0
const warning = (code: EngineWarning['code'], entityId: string, message: string): EngineWarning => ({ code, entityId, message })
const WARNING_MESSAGES = {
  OPERATIONAL_VALIDATION_REQUIRED: 'Hypothetical simulation; operational validation is required.',
  APPROVAL_PENDING: 'Required external confirmations remain pending; selection does not authorize work.',
  UNVERIFIED_ASSUMPTIONS: 'User-supplied recovery assumptions remain unverified.',
  BASELINE_DEADLINE_BREACH: 'The baseline already breaches this milestone deadline.',
  EXPLANATION_TRUNCATED: 'Causal explanation output is truncated; calculated timings and classification are complete.',
  COST_NOT_ENTERED: 'Additional recovery cost: Not entered. Unknown is not zero.',
} as const

const descendants = (targetId: string, graph: GraphData): string[] => {
  const found = new Set<string>(); const queue = [targetId]
  while (queue.length) { const current = queue.shift() as string; for (const dependency of graph.dependenciesByPredecessor[current]) if (!found.has(dependency.successorId)) { found.add(dependency.successorId); queue.push(dependency.successorId) } }
  return [...found].sort(ordinal)
}

const cloneEffective = (baseline: BaselineSnapshot): Map<string, { activity: Activity; earliestStartMinute: number; durationMinutes: number }> => new Map(baseline.activities.map((activity) => [activity.id, { activity, earliestStartMinute: activity.earliestStartMinute, durationMinutes: activity.durationMinutes }]))

const emptyChanges = (): Record<string, { start: boolean; duration: boolean }> => Object.create(null) as Record<string, { start: boolean; duration: boolean }>

const buildImpacts = (baseline: BaselineSnapshot, baselineTimings: Readonly<Record<string, { startMinute: number; finishMinute: number }>>, timings: Readonly<Record<string, { startMinute: number; finishMinute: number }>>, incidentTimings: Readonly<Record<string, { startMinute: number; finishMinute: number }>> | null): MilestoneImpact[] => baseline.milestones.map((milestone) => {
  const baselineFinish = baselineTimings[milestone.activityId].finishMinute; const finish = timings[milestone.activityId].finishMinute
  return { milestoneId: milestone.id, activityId: milestone.activityId, deadlineMinute: milestone.deadlineMinute, baselineFinishMinute: baselineFinish, finishMinute: finish, delayFromBaselineMinutes: finish - baselineFinish, breachMinutes: Math.max(0, finish - milestone.deadlineMinute), baselineBreachMinutes: Math.max(0, baselineFinish - milestone.deadlineMinute), breachDeltaMinutes: Math.max(0, finish - milestone.deadlineMinute) - Math.max(0, baselineFinish - milestone.deadlineMinute), recoveredMinutes: incidentTimings ? incidentTimings[milestone.activityId].finishMinute - finish : null }
}).sort((a, b) => ordinal(a.milestoneId, b.milestoneId))

const buildResult = (scenarioId: string, kind: ScenarioResult['kind'], baseline: BaselineSnapshot, graph: GraphData, scheduleOutput: ScheduleOutput, baselineOutput: ScheduleOutput, incident: Incident | null, recovery: RecoveryOption | null, currency: string, incidentTimings: Readonly<Record<string, { startMinute: number; finishMinute: number }>> | null): ScenarioResult => {
  const timings = scheduleOutput.timings
  const activityDeltas = baseline.activities.map((activity) => ({ activityId: activity.id, startDeltaMinutes: timings[activity.id].startMinute - baselineOutput.timings[activity.id].startMinute, finishDeltaMinutes: timings[activity.id].finishMinute - baselineOutput.timings[activity.id].finishMinute })).sort((a, b) => ordinal(a.activityId, b.activityId))
  const shifted = activityDeltas.filter((delta) => delta.startDeltaMinutes !== 0 || delta.finishDeltaMinutes !== 0).map((delta) => delta.activityId)
  const incidentDescendantIds = incident ? descendants(incident.targetActivityId, graph) : []
  const downstreamAffected = incident && incident.startDelayMinutes > 0 ? incidentDescendantIds.filter((id) => activityDeltas.find((delta) => delta.activityId === id)?.startDeltaMinutes !== 0) : []
  const milestoneImpacts = buildImpacts(baseline, baselineOutput.timings, timings, incidentTimings)
  const warnings: EngineWarning[] = [warning('OPERATIONAL_VALIDATION_REQUIRED', baseline.event.id, WARNING_MESSAGES.OPERATIONAL_VALIDATION_REQUIRED)]
  for (const milestone of milestoneImpacts) if (milestone.baselineBreachMinutes > 0) warnings.push(warning('BASELINE_DEADLINE_BREACH', milestone.milestoneId, WARNING_MESSAGES.BASELINE_DEADLINE_BREACH))
  if (recovery) {
    if (recovery.approvalStatus === 'pending') warnings.push(warning('APPROVAL_PENDING', recovery.id, WARNING_MESSAGES.APPROVAL_PENDING))
    if (recovery.assumptionNotes.length) warnings.push(warning('UNVERIFIED_ASSUMPTIONS', recovery.id, WARNING_MESSAGES.UNVERIFIED_ASSUMPTIONS))
    if (recovery.costMinorUnits === null) warnings.push(warning('COST_NOT_ENTERED', recovery.id, WARNING_MESSAGES.COST_NOT_ENTERED))
  }
  for (const explanation of scheduleOutput.explanations) if (explanation.truncated) warnings.push(warning('EXPLANATION_TRUNCATED', explanation.activityId, WARNING_MESSAGES.EXPLANATION_TRUNCATED))
  const explanations: CausalExplanation[] = scheduleOutput.explanations.map((explanation) => ({ ...explanation, incidentReachable: incidentDescendantIds.includes(explanation.activityId), startCauseKinds: explanation.startCauseKinds, finishCauseKinds: explanation.finishCauseKinds }))
  warnings.sort((a, b) => ordinal(`${a.code}\u0000${a.entityId}`, `${b.code}\u0000${b.entityId}`))
  return { engineVersion: '1', scenarioId, kind, eventId: baseline.event.id, baselineVersion: baseline.baselineVersion, incidentId: incident?.id ?? null, recoveryOptionId: recovery?.id ?? null, topologicalOrder: graph.topologicalOrder, activityTimings: timings, activityDeltas, shiftedActivityIds: shifted, incidentDescendantIds, downstreamAffectedActivityIds: downstreamAffected.sort(ordinal), milestoneImpacts, affectedMilestones: milestoneImpacts.filter((milestone) => milestone.delayFromBaselineMinutes !== 0), deadlineBreaches: milestoneImpacts.filter((milestone) => milestone.breachMinutes > 0), recoveryCostMinorUnits: recovery ? recovery.costMinorUnits : 0, currency, approvalStatus: recovery?.approvalStatus ?? 'not_required', approvalRequirements: recovery?.approvalRequirements ?? [], approvalContext: recovery?.approvalContext ?? null, assumptionNotes: recovery?.assumptionNotes ?? [], explanationPaths: explanations, validationWarnings: warnings }
}

export interface CalculatedSet { readonly baseline: ScenarioResult; readonly incident: ScenarioResult | null; readonly recovery: ScenarioResult | null }

export const calculateScenario = (request: { readonly kind: 'baseline' | 'incident' | 'recovery'; readonly baseline: BaselineSnapshot; readonly currency: string; readonly limits: EngineLimits; readonly scenarioId: string; readonly incident?: Incident; readonly recovery?: RecoveryOption }): Result<CalculatedSet> => {
  const baselineResult = validateBaseline(request.baseline, 'runnable', request.limits); if (!baselineResult.ok) return baselineResult
  const currencyResult = validateCurrency(request.currency); if (!currencyResult.ok) return currencyResult
  const limitsResult = validateLimits(request.limits); if (!limitsResult.ok) return limitsResult
  const graphResult = validateGraph(baselineResult.value); if (!graphResult.ok) return graphResult
  const baseline = baselineResult.value; const graph = graphResult.value
  const baseSchedule = schedule(baseline, graph, cloneEffective(baseline), request.limits); if (!baseSchedule.ok) return baseSchedule
  const baselineScenario = buildResult(request.kind === 'baseline' ? request.scenarioId : `${request.scenarioId}:baseline`, 'baseline', baseline, graph, baseSchedule.value, baseSchedule.value, null, null, request.currency, null)
  if (request.kind === 'baseline') return success({ baseline: { ...baselineScenario, scenarioId: request.scenarioId }, incident: null, recovery: null })
  if (!request.incident) return failure(error('INVALID_SHAPE', '/incident', 'Incident is required.'))
  const incidentResult = validateIncident(request.incident, baseline); if (!incidentResult.ok) return incidentResult
  const incidentEffective = applyIncidentAnchor(baseline.activities, baseSchedule.value.timings, request.incident.targetActivityId, request.incident.startDelayMinutes)
  const incidentSchedule = schedule(baseline, graph, incidentEffective, request.limits); if (!incidentSchedule.ok) return incidentSchedule
  const incidentScenario = buildResult(request.kind === 'incident' ? request.scenarioId : `${request.scenarioId}:incident`, 'incident', baseline, graph, incidentSchedule.value, baseSchedule.value, request.incident, null, request.currency, null)
  if (request.kind === 'incident') return success({ baseline: baselineScenario, incident: { ...incidentScenario, scenarioId: request.scenarioId }, recovery: null })
  if (!request.recovery) return failure(error('INVALID_SHAPE', '/recovery', 'Recovery option is required.'))
  const recoveryResult = validateRecoveryOption(request.recovery, baseline, request.incident, request.currency, request.limits); if (!recoveryResult.ok) return recoveryResult
  const recovery = recoveryResult.value
  const protectedActivities = new Map(baseline.activities.map((activity) => [activity.id, activity]))
  for (const modification of recovery.modifications) { const activity = protectedActivities.get(modification.activityId) as Activity; if (modification.field === 'duration' && activity.classification === 'protected') { const next = modification.operation === 'set' ? modification.valueMinutes : activity.durationMinutes + modification.valueMinutes; if (next < activity.durationMinutes) return failure(error('PROTECTED_DURATION', `/recovery/modifications`, 'Protected activity duration cannot be shortened.', recovery.id, [activity.id])) } if (activity.classification === 'approval_required' && recovery.approvalStatus === 'not_required') return failure(error('APPROVAL_REQUIRED', `/recovery/approvalStatus`, 'This modification requires approval.', recovery.id, [activity.id])) }
  const changes = emptyChanges(); for (const modification of recovery.modifications) changes[modification.activityId] = { start: modification.field === 'earliest_start', duration: modification.field === 'duration' }
  const recoveryEffective = applyModifications(incidentEffective, recovery.modifications)
  for (const current of recoveryEffective.values()) if (current.earliestStartMinute < 0 || current.durationMinutes < 0 || current.earliestStartMinute > request.limits.maxMinute || current.durationMinutes > request.limits.maxMinute) return failure(error('OUT_OF_RANGE', '/recovery/modifications', 'Recovery value is outside configured limits.', recovery.id))
  const recoverySchedule = schedule(baseline, graph, recoveryEffective, request.limits, changes); if (!recoverySchedule.ok) return recoverySchedule
  const recoveryScenario = buildResult(request.scenarioId, 'recovery', baseline, graph, recoverySchedule.value, baseSchedule.value, request.incident, recovery, request.currency, incidentSchedule.value.timings)
  return success({ baseline: baselineScenario, incident: incidentScenario, recovery: recoveryScenario })
}
