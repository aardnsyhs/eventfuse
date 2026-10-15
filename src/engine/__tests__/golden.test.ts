import { describe, expect, it } from 'vitest'
import { buildDecisionBrief, calculate, compareRecoveries, parseRecoveryCost } from '../index'
import { comparisonRequest, deepFreeze, fixtureCase, fixtures, projectErrors, projectScenario } from './fixtures'

describe('immutable golden engine requests', () => {
  it.each(fixtures.cases)('$id', ({ request, expected }) => {
    const result = calculate(deepFreeze(structuredClone(request)))
    expect(result.ok).toBe(expected.ok)
    if (result.ok) expect(projectScenario(result.value, expected.projection!)).toEqual(expected.projection)
    else expect(projectErrors(result.errors)).toEqual(expected.errors)
  })
})
describe('golden recovery comparisons', () => {
  it.each(fixtures.comparisonGroups)('$id', group => {
    const request = comparisonRequest(group)
    const result = compareRecoveries(deepFreeze(request))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const baselineExpected = fixtureCase(group.baselineCaseId).expected.projection!
    const incidentExpected = fixtureCase(group.incidentCaseId).expected.projection!
    expect(projectScenario(result.value.baseline, baselineExpected)).toEqual(baselineExpected)
    expect(projectScenario(result.value.unmitigated, incidentExpected)).toEqual(incidentExpected)
    expect(result.value.alternatives.map(a => {
      expect(a.result.ok).toBe(true)
      if (!a.result.ok) throw new Error('Golden option rejected')
      const r = a.result.value, m = r.milestoneImpacts[0]
      const source = fixtures.cases.find(c => c.request.scenarioId === r.scenarioId)!
      expect(projectScenario(r, source.expected.projection!)).toEqual(source.expected.projection)
      return { recoveryOptionId: a.recoveryOptionId, finishMinute: m.finishMinute, recoveredMinutes: m.recoveredMinutes, breachMinutes: m.breachMinutes, costMinorUnits: r.recoveryCostMinorUnits, shiftedCount: r.shiftedActivityIds.length, approvalStatus: r.approvalStatus }
    })).toEqual(group.expected)
  })
})
describe('golden cost parser', () => {
  it.each(fixtures.costInputCases)('$id', ({ costDraft, currency, expected }) => {
    const result = parseRecoveryCost(deepFreeze(costDraft), currency)
    expect(result.ok ? result : { ok: false, errors: projectErrors(result.errors) }).toEqual(expected)
  })
})
describe('golden decision briefs', () => {
  it.each(fixtures.briefCases)('$id', fixture => {
    const group = fixtures.comparisonGroups.find(g => g.id === fixture.comparisonGroupId)!
    const source = comparisonRequest(group)
    const request = { ...source, alternatives: source.alternatives.map(o => ({ ...o, status: o.id === fixture.selectRecoveryOptionId ? 'selected' as const : 'draft' as const })) }
    const result = buildDecisionBrief(deepFreeze(request), fixture.selectRecoveryOptionId, deepFreeze(fixture.metadata))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const b = result.value
    expect({ ok: true, selectedCostMinorUnits: b.scenarioSnapshot.recoveryCostMinorUnits, selectedApprovalStatus: b.scenarioSnapshot.approvalStatus, baselineDoorsFinishMinute: b.baselineSnapshot.activityTimings.doors.finishMinute, unmitigatedDoorsFinishMinute: b.unmitigatedSnapshot.activityTimings.doors.finishMinute, selectedDoorsFinishMinute: b.scenarioSnapshot.activityTimings.doors.finishMinute, recoveredMinutes: b.scenarioSnapshot.milestoneImpacts[0].recoveredMinutes, comparisonResultOptionIds: b.comparisonResultSnapshots.map(r => r.recoveryOptionId), requiredWarningCodes: [...new Set(b.scenarioSnapshot.validationWarnings.map(w => w.code))].sort(), hypothetical: b.hypothetical }).toEqual(fixture.expected)
    expect(b.approvalDisclaimer).toBe('Hypothetical simulation. Operational validation is required. Selection does not authorize work; pending approvals remain outstanding.')
    const snapshot = JSON.stringify(b)
    expect(buildDecisionBrief(request, fixture.selectRecoveryOptionId, fixture.metadata)).toEqual(result)
    expect(JSON.stringify(b)).toBe(snapshot)
  })
})
