import { describe, expect, it } from 'vitest'
import type { BaselineSnapshot, EngineWarning, ScenarioResult } from '../../domain/types'
import type { ComparisonRequest, EngineRequest } from '../../domain/engine-api'
import type { Result } from '../errors'
import { buildDecisionBrief, calculate, compareRecoveries, parseRecoveryCost, validateBaseline, validateRequest } from '../index'
import { canonicalWarnings } from '../scenarios'
import { comparisonRequest, deepFreeze, fixtures, generatedDag, mutableRequest, recoveryRequest } from './fixtures'

function value<T>(result: Result<T>): T {
  expect(result.ok, JSON.stringify(result)).toBe(true)
  if (!result.ok) throw new Error(JSON.stringify(result.errors))
  return result.value
}
const result = (request: EngineRequest) => value(calculate(request))
const explanation = (r: ScenarioResult, id: string) => r.explanationPaths.find(e => e.activityId === id)!
const compareRequest = () => structuredClone(comparisonRequest(fixtures.comparisonGroups[1]))
const briefMetadata = () => structuredClone(fixtures.briefCases[0].metadata)
const selectedRequest = (): ComparisonRequest => {
  const request = compareRequest()
  return { ...request, alternatives: request.alternatives.map((o, i) => ({ ...o, status: i === 0 ? 'selected' : 'draft' })) }
}

// Relax every constraint until fixed, independently of the production topological scheduler.
function relaxedSchedule(baseline: BaselineSnapshot): Record<string, { startMinute: number; finishMinute: number }> {
  const starts = Object.fromEntries(baseline.activities.map(a => [a.id, a.earliestStartMinute]))
  const durations = Object.fromEntries(baseline.activities.map(a => [a.id, a.durationMinutes]))
  for (let pass = 0; pass < baseline.activities.length; pass++) {
    let changed = false
    for (const edge of baseline.dependencies) {
      const next = starts[edge.predecessorId] + durations[edge.predecessorId] + edge.lagMinutes
      if (starts[edge.successorId] < next) { starts[edge.successorId] = next; changed = true }
    }
    if (!changed) break
  }
  return Object.fromEntries(baseline.activities.map(a => [a.id, { startMinute: starts[a.id], finishMinute: starts[a.id] + a.durationMinutes }]))
}

describe('public contract and validation boundaries', () => {
  it('exports the two-argument draft/runnable baseline validator', () => {
    const baseline = mutableRequest().baseline
    baseline.activities = []; baseline.dependencies = []; baseline.milestones = []
    expect(validateBaseline(baseline, 'draft').ok).toBe(true)
    expect(validateBaseline(baseline, 'runnable').ok).toBe(false)
  })
  it.each([null, undefined, [], 'request', 0])('rejects malformed public requests: %s', input => {
    expect(calculate(input as unknown as EngineRequest).ok).toBe(false)
    expect(compareRecoveries(input as unknown as ComparisonRequest).ok).toBe(false)
  })
  it.each(['kind', 'limits', 'scenarioId', 'currency', 'baseline'])('requires %s without coercion/defaulting', key => {
    const input = { ...mutableRequest() } as Record<string, unknown>
    delete input[key]
    expect(validateRequest(input).ok).toBe(false)
  })
  it.each(['maxMinute', 'maxActivities', 'maxDependencies', 'maxMilestones', 'maxModifications', 'maxCauseEdges'])('requires limit %s', key => {
    const input = mutableRequest()
    delete (input.limits as unknown as Record<string, unknown>)[key]
    expect(validateRequest(input)).toMatchObject({ ok: false, errors: [{ code: 'INVALID_SHAPE', path: `/limits/${key}` }] })
  })
  it.each([NaN, Infinity, 1.5, -1])('rejects invalid configured limit %s', n => {
    const input = mutableRequest(); input.limits.maxMinute = n
    expect(validateRequest(input).ok).toBe(false)
  })
  it.each(['__proto__', 'constructor', 'prototype', ''])('rejects unsafe activity ID %s', id => {
    const input = mutableRequest(); input.baseline.activities[0].id = id
    expect(calculate(input).ok).toBe(false)
  })
  it.each(['2026-02-29', '2026-04-31', '2026-13-01'])('rejects normalized impossible dates %s', date => {
    const input = mutableRequest(); input.baseline.event.date = date
    expect(calculate(input)).toMatchObject({ ok: false, errors: expect.arrayContaining([expect.objectContaining({ code: 'INVALID_DATE', path: '/baseline/event/date' })]) })
  })
  it.each(['2026-02-30T01:00:00Z', '2026-10-15T01:00:01Z', '2026-10-15T01:00:00+07:00'])('rejects invalid/nonaligned reference instant %s', instant => {
    const input = mutableRequest(); input.baseline.event.referenceInstant = instant
    expect(calculate(input).ok).toBe(false)
  })
  it('accepts leap day, validates audit order and timezone independently', () => {
    const input = mutableRequest(); input.baseline.event.date = '2028-02-29'
    expect(calculate(input).ok).toBe(true)
    input.baseline.event.updatedAt = '2026-10-14T00:00:00Z'
    expect(calculate(input).ok).toBe(false)
    input.baseline.event.updatedAt = input.baseline.event.createdAt; input.baseline.event.timezone = 'Invalid/Zone'
    expect(calculate(input).ok).toBe(false)
  })
  it.each(['event', 'activity', 'dependency', 'milestone', 'incident', 'option', 'modification'])('rejects unexpected fields in %s', entity => {
    const input = recoveryRequest()
    const target = { event: input.baseline.event, activity: input.baseline.activities[0], dependency: input.baseline.dependencies[0], milestone: input.baseline.milestones[0], incident: input.incident, option: input.recovery, modification: input.recovery.modifications[0] }[entity]
    if (!target) throw new Error('Unknown entity test case')
    Object.assign(target, { unexpected: true })
    expect(calculate(input).ok).toBe(false)
  })
  it('enforces text and collection bounds', () => {
    const input = recoveryRequest(); input.baseline.activities[0].notes = 'x'.repeat(10001)
    expect(calculate(input).ok).toBe(false)
    input.baseline.activities[0].notes = null; input.recovery.assumptionNotes = Array(101).fill('note')
    expect(calculate(input).ok).toBe(false)
    input.recovery.assumptionNotes = []; input.limits.maxActivities = 5
    expect(calculate(input)).toMatchObject({ ok: false, errors: expect.arrayContaining([expect.objectContaining({ code: 'LIMIT_EXCEEDED' })]) })
  })
  it.each([NaN, Infinity, -1, 1.5])('rejects duration %s with no cascade of missing references', duration => {
    const input = mutableRequest(); input.baseline.activities[0].durationMinutes = duration
    const output = calculate(input)
    expect(output.ok).toBe(false)
    if (!output.ok) expect(output.errors).toHaveLength(1)
  })
  it('rejects missing, cross-event and self references without entering scheduling', () => {
    for (const change of ['missing', 'foreign', 'self']) {
      const input = mutableRequest(), edge = input.baseline.dependencies[0]
      if (change === 'missing') edge.successorId = 'missing'
      if (change === 'foreign') edge.eventId = 'foreign'
      if (change === 'self') edge.successorId = edge.predecessorId
      expect(calculate(input).ok).toBe(false)
    }
  })
  it('rejects duplicate IDs, dependency pairs and invalid milestone duration', () => {
    const input = mutableRequest(); input.baseline.dependencies.push({ ...input.baseline.dependencies[0], id: 'another' })
    expect(calculate(input)).toMatchObject({ ok: false, errors: expect.arrayContaining([expect.objectContaining({ code: 'DUPLICATE_DEPENDENCY' })]) })
    input.baseline.dependencies.pop(); input.baseline.activities.push({ ...input.baseline.activities[0] })
    expect(calculate(input).ok).toBe(false)
    input.baseline.activities.pop(); input.baseline.activities.at(-1)!.durationMinutes = 1
    expect(calculate(input).ok).toBe(false)
  })
  it('rejects malformed optional approval records instead of silently discarding them', () => {
    for (const bad of [null, 'pending', [{}], [{ approverLabel: 3, condition: 'condition' }]]) {
      const input = recoveryRequest(); Object.assign(input.recovery, { approvalRequirements: bad })
      expect(calculate(input).ok).toBe(false)
    }
    const input = recoveryRequest(); Object.assign(input.recovery, { approvalContext: 3 })
    expect(calculate(input).ok).toBe(false)
  })
  it('distinguishes invalid cost types, missing cost, unknown and explicit zero', () => {
    const input = recoveryRequest()
    for (const bad of [NaN, Infinity, '0', undefined, 0.5]) {
      Object.assign(input.recovery, { costMinorUnits: bad })
      expect(calculate(input).ok).toBe(false)
    }
    input.recovery.costMinorUnits = null
    expect(result(input).recoveryCostMinorUnits).toBeNull()
    input.recovery.costMinorUnits = 0
    expect(result(input).validationWarnings.some(w => w.code === 'COST_NOT_ENTERED')).toBe(false)
  })
  it('validates parser draft shape and exact maximum minor units', () => {
    for (const bad of [null, {}, { kind: 'editing' }, { kind: 'editing', text: 1 }]) expect(parseRecoveryCost(bad as never, 'USD').ok).toBe(false)
    expect(parseRecoveryCost({ kind: 'editing', text: '90071992547409.91' }, 'USD')).toEqual({ ok: true, value: Number.MAX_SAFE_INTEGER })
    expect(parseRecoveryCost({ kind: 'editing', text: '90071992547409.92' }, 'USD').ok).toBe(false)
    expect(parseRecoveryCost({ kind: 'editing', text: ' 001.20 ' }, 'IDR')).toEqual({ ok: true, value: 120 })
  })
})

describe('comparison and brief guards', () => {
  it('rejects duplicate option IDs with stable paths', () => {
    const source = compareRequest(), input = { ...source, alternatives: [source.alternatives[0], source.alternatives[0]] }
    expect(compareRecoveries(input)).toMatchObject({ ok: false, errors: [{ code: 'DUPLICATE_ID', path: '/alternatives/1/id', entityId: source.alternatives[0].id }] })
  })
  it.each(['baseline-incident', 'baseline-option', 'options'])('rejects duplicate scenario IDs: %s', which => {
    const source = compareRequest(), ids = { ...source.scenarioIds, recoveries: { ...source.scenarioIds.recoveries } }
    if (which === 'baseline-incident') ids.incident = ids.baseline
    if (which === 'baseline-option') ids.recoveries[source.alternatives[0].id] = ids.baseline
    if (which === 'options') ids.recoveries[source.alternatives[1].id] = ids.recoveries[source.alternatives[0].id]
    expect(compareRecoveries({ ...source, scenarioIds: ids })).toMatchObject({ ok: false, errors: [{ code: 'DUPLICATE_ID' }] })
  })
  it('rejects missing/invalid scenario mappings and empty/excess options', () => {
    const source = compareRequest()
    for (const alternatives of [[], [...source.alternatives, ...source.alternatives]]) expect(compareRecoveries({ ...source, alternatives }).ok).toBe(false)
    expect(compareRecoveries({ ...source, scenarioIds: { ...source.scenarioIds, recoveries: {} } }).ok).toBe(false)
    expect(compareRecoveries({ ...source, scenarioIds: { ...source.scenarioIds, baseline: '' } }).ok).toBe(false)
  })
  it.each(['incident', 'currency'])('rejects mixed %s at comparison request level', field => {
    const source = compareRequest()
    const alternatives = source.alternatives.map((o, i) => i ? { ...o, ...(field === 'currency' ? { currency: 'GBP' } : { incidentId: 'foreign' }) } : o)
    expect(compareRecoveries({ ...source, alternatives }).ok).toBe(false)
  })
  it('preserves valid siblings and remaps protected errors to comparison paths', () => {
    const source = compareRequest(), bad = { ...source.alternatives[1], modifications: [{ activityId: 'testing', field: 'duration' as const, operation: 'set' as const, valueMinutes: 30 }] }
    const output = value(compareRecoveries({ ...source, alternatives: [source.alternatives[0], bad] }))
    expect(output.alternatives[0].result.ok).toBe(true)
    expect(output.alternatives[1].result).toMatchObject({ ok: false, errors: [{ code: 'PROTECTED_DURATION', path: '/alternatives/1/modifications/0/valueMinutes', entityId: 'testing' }] })
  })
  it('requires exactly one selected option, matching the requested ID', () => {
    const request = compareRequest(), id = request.alternatives[0].id, metadata = briefMetadata()
    expect(buildDecisionBrief(request, id, metadata).ok).toBe(false)
    expect(buildDecisionBrief({ ...request, alternatives: request.alternatives.map(o => ({ ...o, status: 'selected' })) }, id, metadata)).toMatchObject({ ok: false, errors: [{ code: 'SELECTION_MISMATCH' }] })
    expect(buildDecisionBrief(selectedRequest(), 'unknown', metadata).ok).toBe(false)
    expect(buildDecisionBrief(selectedRequest(), request.alternatives[1].id, metadata).ok).toBe(false)
  })
  it('excludes failed alternatives from both snapshot collections', () => {
    const source = selectedRequest(), bad = { ...source.alternatives[1], modifications: [{ activityId: 'testing', field: 'duration' as const, operation: 'set' as const, valueMinutes: 1 }] }
    const brief = value(buildDecisionBrief({ ...source, alternatives: [source.alternatives[0], bad] }, source.alternatives[0].id, briefMetadata()))
    expect(brief.comparisonOptionSnapshots.map(o => o.id)).toEqual([source.alternatives[0].id])
    expect(brief.comparisonResultSnapshots.map(r => r.recoveryOptionId)).toEqual([source.alternatives[0].id])
  })
  it('sorts brief option snapshots with their result snapshots and isolates later edits', () => {
    const request = selectedRequest(), metadata = briefMetadata()
    const brief = value(buildDecisionBrief({ ...request, alternatives: [...request.alternatives].reverse() }, request.alternatives[0].id, metadata))
    expect(brief.comparisonOptionSnapshots.map(o => o.id)).toEqual(brief.comparisonResultSnapshots.map(r => r.recoveryOptionId))
    const saved = JSON.stringify(brief)
    Object.assign(request.baseline.event, { name: 'changed' }); (metadata.nextActions as string[]).push('later action')
    ;(request.alternatives[0].assumptionNotes as string[]).push('later assumption')
    expect(JSON.stringify(brief)).toBe(saved)
  })
  it('rejects invalid metadata and invalid selected options', () => {
    const request = selectedRequest(), metadata = briefMetadata()
    for (const bad of [null, { ...metadata, createdAt: '2026-02-30T00:00:00Z' }, { ...metadata, nextActions: [3] }, { ...metadata, id: '' }]) expect(buildDecisionBrief(request, request.alternatives[0].id, bad as never).ok).toBe(false)
    const invalid = { ...request, alternatives: request.alternatives.map(o => ({ ...o, modifications: [{ activityId: 'testing', field: 'duration' as const, operation: 'set' as const, valueMinutes: 1 }] })) }
    expect(buildDecisionBrief(invalid, request.alternatives[0].id, metadata).ok).toBe(false)
  })
})

describe('constraints, bindings and actual provenance', () => {
  it('returns real closed cycle witnesses and excludes downstream tails', () => {
    const input = mutableRequest(); input.baseline.dependencies.push({ ...input.baseline.dependencies[0], id: 'back', predecessorId: 'testing', successorId: 'power' })
    const output = calculate(input)
    expect(output.ok).toBe(false)
    if (output.ok) return
    const witness = output.errors.find(e => e.code === 'CYCLE')!.relatedIds
    expect(witness[0]).toBe(witness.at(-1)); expect(witness).not.toContain('doors'); expect(witness).not.toContain('rehearsal')
    for (let i = 1; i < witness.length; i++) expect(input.baseline.dependencies.some(d => d.predecessorId === witness[i - 1] && d.successorId === witness[i])).toBe(true)
  })
  it('records baseline and scenario binding ties, including earliest-start ties', () => {
    const input = mutableRequest('figma-power-plus-60-slack'), output = result(input)
    expect(explanation(output, 'audio').baselineBindingDependencyIds).toEqual(['d1'])
    const testing = explanation(output, 'testing')
    expect(testing.bindingDependencyIds).toEqual(['d3', 'd4']); expect(testing.bindingEarliestStart).toBe(true)
    expect(testing.startCauseKinds).toEqual([])
    expect(explanation(result(mutableRequest()), 'testing').startCauseKinds).toEqual(['incident'])
  })
  it('traces ancestor constraints instead of only direct edges', () => {
    const output = result(mutableRequest()), doors = explanation(output, 'doors')
    expect(doors.causeEdges.filter(e => e.constraintContext === 'scenario').map(e => e.dependencyId)).toEqual(['d1', 'd2', 'd3', 'd4', 'd5', 'd6'])
    for (const edge of doors.causeEdges) expect(edge.candidateStartMinute).toBe(edge.predecessorFinishMinute + edge.lagMinutes)
  })
  it('retains relaxed baseline constraints when a recovery moves a successor earlier', () => {
    const input = recoveryRequest(); input.incident.startDelayMinutes = 0
    input.recovery.modifications = [{ activityId: 'audio', field: 'duration', operation: 'set', valueMinutes: 60 }]
    input.baseline.activities.find(a => a.id === 'lighting')!.durationMinutes = 60
    input.baseline.activities.find(a => a.id === 'testing')!.earliestStartMinute = 0
    const output = result(input), testing = explanation(output, 'testing')
    expect(testing.baselineBindingDependencyIds).toEqual(['d3']); expect(testing.bindingDependencyIds).toEqual(['d3', 'd4'])
    expect(testing.startCauseKinds).toEqual(['recovery'])
    expect(testing.causeEdges).toContainEqual(expect.objectContaining({ constraintContext: 'baseline', dependencyId: 'd3', candidateStartMinute: 240 }))
  })
  it('separates descendants, shifted descendants and incident-caused descendants', () => {
    const input = recoveryRequest('duration-only-direct-finish-change'), output = result(input)
    expect(output.incidentDescendantIds).toHaveLength(5)
    expect(output.shiftedActivityIds.filter(id => output.incidentDescendantIds.includes(id))).toEqual(['audio', 'lighting'])
    expect(output.downstreamAffectedActivityIds).toEqual([])
    expect(explanation(output, 'audio').startCauseKinds).toEqual(['recovery'])
  })
  it('does not attribute a recovery-only descendant shift to a masked incident', () => {
    const input = recoveryRequest(); input.incident.startDelayMinutes = 30
    input.recovery.modifications = [{ activityId: 'rehearsal', field: 'duration', operation: 'add', valueMinutes: 120 }]
    const output = result(input)
    expect(output.shiftedActivityIds).toContain('doors')
    expect(output.downstreamAffectedActivityIds).toEqual(['audio', 'lighting'])
    expect(explanation(output, 'doors').startCauseKinds).toEqual(['recovery'])
  })
  it('keeps both direct modification flags and provenance kinds', () => {
    const input = recoveryRequest(); input.recovery.modifications = [{ activityId: 'power', field: 'earliest_start', operation: 'set', valueMinutes: 120 }, { activityId: 'power', field: 'duration', operation: 'add', valueMinutes: 30 }]
    const output = result(input), power = explanation(output, 'power')
    expect(power.startChangedDirectly).toBe(true); expect(power.durationChangedDirectly).toBe(true)
    expect(power.startCauseKinds).toEqual(['incident', 'recovery']); expect(power.finishCauseKinds).toEqual(['incident', 'recovery'])
  })
  it('bounds explanation output without changing complete classification or timings', () => {
    const input = mutableRequest(), full = result(input); input.limits.maxCauseEdges = 1
    const limited = result(input)
    expect(limited.activityTimings).toEqual(full.activityTimings)
    expect(limited.downstreamAffectedActivityIds).toEqual(full.downstreamAffectedActivityIds)
    expect(limited.explanationPaths.every(e => e.causeEdges.length <= 1)).toBe(true)
    expect(explanation(limited, 'doors').truncated).toBe(true)
    expect(limited.validationWarnings).toContainEqual(expect.objectContaining({ code: 'EXPLANATION_TRUNCATED', entityId: 'doors' }))
  })
  it('deduplicates warnings by code/entity and sorts canonically', () => {
    const w: EngineWarning = { code: 'COST_NOT_ENTERED', entityId: 'a', message: 'Not entered' }
    expect(canonicalWarnings([w, w, { ...w, entityId: 'b' }])).toEqual([w, { ...w, entityId: 'b' }])
    const output = result(recoveryRequest())
    expect(new Set(output.validationWarnings.map(w => JSON.stringify([w.code, w.entityId]))).size).toBe(output.validationWarnings.length)
    expect(canonicalWarnings([...output.validationWarnings].reverse())).toEqual(output.validationWarnings)
  })
  it('allows protected equal/extended duration but never shortening; pending remains conditional', () => {
    for (const duration of [59, 60, 61]) {
      const input = recoveryRequest(); input.recovery.modifications = [{ activityId: 'testing', field: 'duration', operation: 'set', valueMinutes: duration }]
      const output = calculate(input)
      expect(output.ok).toBe(duration >= 60)
      if (output.ok) { expect(output.value.approvalStatus).toBe('pending'); expect(output.value.validationWarnings.some(w => w.code === 'APPROVAL_PENDING')).toBe(true) }
    }
  })
  it('reports all milestones using finish, including existing breach and deadline equality', () => {
    const input = mutableRequest('corporate-launch-baseline')
    input.baseline.milestones.push({ id: 'power-finish', eventId: 'launch', activityId: 'power', deadlineMinute: 100, label: 'Power finish' })
    const output = result(input)
    expect(output.milestoneImpacts.map(m => m.milestoneId)).toEqual(['doors-deadline', 'power-finish'])
    expect(output.deadlineBreaches).toMatchObject([{ milestoneId: 'power-finish', baselineBreachMinutes: 20, breachMinutes: 20, delayFromBaselineMinutes: 0 }])
    expect(output.activityTimings.doors).toEqual({ startMinute: 540, finishMinute: 540 })
  })
  it('keeps historical revision identity and rejects a mismatched source', () => {
    const input = recoveryRequest(); input.baseline.baselineVersion = 'historic-v0'; input.incident.baselineVersion = 'historic-v0'
    expect(result(input).baselineVersion).toBe('historic-v0')
    input.incident.baselineVersion = 'current-v1'
    expect(calculate(input)).toMatchObject({ ok: false, errors: [{ code: 'STALE_BASELINE', relatedIds: ['current-v1', 'historic-v0'] }] })
  })
})

describe('seeded independent scheduling invariants', () => {
  it.each([1, 2, 3, 17, 99, 2026])('matches relaxation oracle, permutation and monotonicity for seed %i', seed => {
    const input = generatedDag(50, seed), before = JSON.stringify(input), baseline = result(deepFreeze(structuredClone(input)))
    expect(baseline.activityTimings).toEqual(relaxedSchedule(input.baseline))
    const positions = Object.fromEntries(baseline.topologicalOrder.map((id, i) => [id, i]))
    for (const edge of input.baseline.dependencies) {
      expect(positions[edge.predecessorId]).toBeLessThan(positions[edge.successorId])
      expect(baseline.activityTimings[edge.successorId].startMinute).toBeGreaterThanOrEqual(baseline.activityTimings[edge.predecessorId].finishMinute + edge.lagMinutes)
    }
    for (const activity of input.baseline.activities) expect(baseline.activityTimings[activity.id].finishMinute - baseline.activityTimings[activity.id].startMinute).toBe(activity.durationMinutes)
    const permuted = structuredClone(input); permuted.baseline.activities.reverse(); permuted.baseline.dependencies.reverse(); permuted.baseline.milestones.reverse()
    expect(result(permuted)).toEqual(baseline); expect(JSON.stringify(result(input))).toBe(JSON.stringify(baseline)); expect(JSON.stringify(input)).toBe(before)
    for (const field of ['durationMinutes', 'earliestStartMinute'] as const) {
      const increased = structuredClone(input); increased.baseline.activities[0][field] += 30
      const changed = result(increased)
      for (const id of baseline.topologicalOrder) { expect(changed.activityTimings[id].startMinute).toBeGreaterThanOrEqual(baseline.activityTimings[id].startMinute); expect(changed.activityTimings[id].finishMinute).toBeGreaterThanOrEqual(baseline.activityTimings[id].finishMinute) }
    }
  })
  it('isolates recovery evaluation order and source edits from prior results', () => {
    const source = compareRequest(), before = JSON.stringify(source), normal = value(compareRecoveries(deepFreeze(structuredClone(source))))
    expect(value(compareRecoveries({ ...source, alternatives: [...source.alternatives].reverse() }))).toEqual(normal)
    expect(JSON.stringify(source)).toBe(before)
    const saved = JSON.stringify(normal); (source.alternatives[0].assumptionNotes as string[]).push('later')
    expect(JSON.stringify(normal)).toBe(saved)
  })
})

describe('arithmetic and representation boundaries', () => {
  it('accepts the exact horizon and rejects a safe finish beyond it', () => {
    const input = generatedDag(1, 1), activity = input.baseline.activities[0]
    activity.earliestStartMinute = 0; activity.durationMinutes = input.limits.maxMinute
    expect(result(input).activityTimings[activity.id].finishMinute).toBe(input.limits.maxMinute)
    activity.earliestStartMinute = 1
    expect(calculate(input)).toMatchObject({ ok: false, errors: [{ code: 'OUT_OF_RANGE', path: '/baseline/activities/0/durationMinutes' }] })
  })
  it('rejects unsafe finish and predecessor-plus-lag arithmetic', () => {
    const input = generatedDag(2, 1)
    input.limits.maxMinute = Number.MAX_SAFE_INTEGER
    input.baseline.activities[0].earliestStartMinute = 1; input.baseline.activities[0].durationMinutes = Number.MAX_SAFE_INTEGER
    expect(calculate(input)).toMatchObject({ ok: false, errors: [{ code: 'OVERFLOW' }] })
    input.baseline.activities[0].earliestStartMinute = 0; input.baseline.activities[1].durationMinutes = 0
    input.baseline.dependencies = [{ id: 'huge', eventId: 'launch', predecessorId: 'a000', successorId: 'a001', type: 'finish_to_start', lagMinutes: 1 }]
    expect(calculate(input)).toMatchObject({ ok: false, errors: [{ code: 'OVERFLOW', path: '/baseline/dependencies/0/lagMinutes' }] })
  })
  it('rejects incident starts and recovery values outside supported arithmetic bounds', () => {
    const input = recoveryRequest(); input.incident.startDelayMinutes = input.limits.maxMinute + 1
    expect(calculate(input)).toMatchObject({ ok: false, errors: [{ code: 'OUT_OF_RANGE', path: '/incident/startDelayMinutes' }] })
    input.incident.startDelayMinutes = 240
    input.recovery.modifications = [{ activityId: 'audio', field: 'duration', operation: 'add', valueMinutes: Number.MAX_SAFE_INTEGER }]
    expect(calculate(input)).toMatchObject({ ok: false, errors: [{ code: 'OVERFLOW', path: '/recovery/modifications/0/valueMinutes' }] })
    input.recovery.modifications[0].valueMinutes = -121
    expect(calculate(input)).toMatchObject({ ok: false, errors: [{ code: 'OUT_OF_RANGE' }] })
  })
  it('rejects sparse arrays and class instances at the JSON boundary', () => {
    const input = mutableRequest(); delete input.baseline.activities[0]
    expect(calculate(input).ok).toBe(false)
    const recovery = recoveryRequest(); recovery.recovery.modifications = new Array(1)
    expect(calculate(recovery).ok).toBe(false)
    class InvalidRecord { constructor() { Object.assign(this, mutableRequest()) } }
    expect(validateRequest(new InvalidRecord()).ok).toBe(false)
  })
  it('orders independent ready tasks ordinally, not by insertion order or locale', () => {
    const input = generatedDag(4, 1); input.baseline.dependencies = []
    const ids = ['z', 'A', 'a', '10']
    input.baseline.activities.forEach((a, i) => { a.id = ids[i] })
    input.baseline.milestones[0].activityId = 'z'
    expect(result(input).topologicalOrder).toEqual(['10', 'A', 'a', 'z'])
  })
  it('preserves valid zero-duration ordinary activities and maximum-lag constraints', () => {
    const input = generatedDag(2, 1)
    input.baseline.activities.forEach(a => { a.earliestStartMinute = 0; a.durationMinutes = 0 })
    input.baseline.dependencies = [{ id: 'lag', eventId: 'launch', predecessorId: 'a000', successorId: 'a001', type: 'finish_to_start', lagMinutes: input.limits.maxMinute }]
    expect(result(input).activityTimings.a001).toEqual({ startMinute: input.limits.maxMinute, finishMinute: input.limits.maxMinute })
  })
})


describe('effective recovery validation', () => {
  it('rejects a recovery that turns a milestone into a nonzero-duration activity', () => {
    const input = recoveryRequest()
    input.recovery.modifications = [{ activityId: 'doors', field: 'duration', operation: 'set', valueMinutes: 1 }]
    expect(validateRequest(input)).toMatchObject({ ok: false, errors: [{ code: 'MILESTONE_DURATION', path: '/recovery/modifications/0/valueMinutes', entityId: 'doors' }] })
    expect(calculate(input).ok).toBe(false)
  })
  it('validates protected and approval constraints through validateRequest itself', () => {
    const input = recoveryRequest()
    input.recovery.modifications = [{ activityId: 'testing', field: 'duration', operation: 'add', valueMinutes: -1 }]
    expect(validateRequest(input)).toMatchObject({ ok: false, errors: [{ code: 'PROTECTED_DURATION' }] })
    input.recovery.modifications = [{ activityId: 'audio', field: 'duration', operation: 'set', valueMinutes: 60 }]
    input.baseline.activities.find(a => a.id === 'audio')!.classification = 'approval_required'
    input.recovery.approvalRequirements = []; input.recovery.approvalStatus = 'not_required'
    expect(validateRequest(input)).toMatchObject({ ok: false, errors: [{ code: 'APPROVAL_REQUIRED', entityId: 'audio' }] })
  })
})
