import { describe, expect, it } from 'vitest'
import { createApplicationController, emptyState, execute, selectHistoricalIncident, selectWorkspace, validateDocument } from '../index'
import { canonical } from '../common'
import { metadata, setup, source } from './helpers'

const selected = () => {
  const s = setup(), ids = s.canonical()
  s.run({ type: 'selection.set', expectedIncidentId: ids.incidentId, id: ids.a })
  return { ...s, ...ids }
}
describe('application lifecycle and real engine integration', () => {
  it('initializes a stable empty snapshot with no fabricated results', () => {
    const c = createApplicationController(), s = c.getSnapshot()
    expect(c.getSnapshot()).toBe(s)
    expect(selectWorkspace(s)).toMatchObject({ event: null, status: 'empty', impact: null, comparison: null, selected: null, briefReady: false, actions: { createEvent: true } })
    expect(c.dispatch({ type: 'baseline.apply', expectedVersion: null }).ok).toBe(false)
  })
  it('runs the canonical baseline, incident, independent A/B, explicit preference and conditional brief', () => {
    const s = setup()
    expect(selectWorkspace(s.controller.getSnapshot()).baselineResult!.activityTimings.doors.finishMinute).toBe(540)
    const ids = s.canonical(), view = selectWorkspace(s.controller.getSnapshot())
    expect(view.impact!.activityTimings.doors.finishMinute).toBe(660)
    expect(view.impact!.milestoneImpacts[0].breachMinutes).toBe(120)
    expect(view.selected).toBeNull(); expect(view.briefReady).toBe(false)
    expect(view.optionResults.map(o => o.result.ok ? [o.result.value.activityTimings.doors.finishMinute, o.result.value.milestoneImpacts[0].recoveredMinutes, o.result.value.recoveryCostMinorUnits, o.result.value.approvalStatus] : null)).toEqual([[540, 120, null, 'pending'], [600, 60, null, 'pending']])
    s.run({ type: 'selection.set', expectedIncidentId: ids.incidentId, id: ids.a })
    expect(selectWorkspace(s.controller.getSnapshot()).briefReady).toBe(true)
    const brief = s.run({ type: 'brief.prepare', expectedIncidentId: ids.incidentId, metadata: metadata() }).brief!
    expect(brief.scenarioSnapshot.recoveryCostMinorUnits).toBeNull(); expect(brief.recoverySnapshot.approvalStatus).toBe('pending')
    expect(brief.scenarioSnapshot.validationWarnings.map(w => w.code)).toContain('COST_NOT_ENTERED')
    expect(brief.approvalDisclaimer).toContain('Selection does not authorize work')
    expect(validateDocument(s.controller.getSnapshot().document).ok).toBe(true)
  })
  it('creates an identity-valid event draft without requiring milestones', () => {
    const c = createApplicationController()
    expect(c.dispatch({ type: 'event.create', event: source('corporate-launch-baseline').baseline.event, currency: 'USD' }).ok).toBe(true)
    expect(c.getSnapshot().document!.baselineVersions).toEqual({})
    expect(c.dispatch({ type: 'baseline.apply', expectedVersion: null }).ok).toBe(false)
  })
  it.each(['event-name', 'currency', 'namespace'])('rejects invalid creation %s without partial source', kind => {
    const c = createApplicationController(), event = source('corporate-launch-baseline').baseline.event
    const result = c.dispatch({ type: 'event.create', event: kind === 'event-name' ? { ...event, name: '' } : event, currency: kind === 'currency' ? 'XXX' : 'USD', namespace: kind === 'namespace' ? 'other' as never : 'workspace' })
    expect(result.ok).toBe(false); expect(c.getSnapshot().document).toBeNull()
  })
  it('preserves useful invalid baseline input while rejecting application atomically', () => {
    const s = setup(), before = s.controller.getSnapshot().document
    const activity = { ...source('corporate-launch-baseline').baseline.activities[0], durationMinutes: -1 }
    s.run({ type: 'activity.put', activity })
    expect(selectWorkspace(s.controller.getSnapshot()).baselineResult).toBeNull()
    const draft = canonical(s.controller.getSnapshot().editing)
    expect(s.controller.dispatch({ type: 'baseline.apply', expectedVersion: before!.currentBaselineVersion }).ok).toBe(false)
    expect(s.controller.getSnapshot().document).toEqual(before)
    expect(canonical(s.controller.getSnapshot().editing)).toBe(draft)
    expect(selectWorkspace(s.controller.getSnapshot()).status).toBe('invalid')
  })
  it('retains immutable nested historical revisions and incident identity after new apply', () => {
    const s = selected(), old = s.controller.getSnapshot(), version = old.document!.currentBaselineVersion!, saved = canonical(old.document!.baselineVersions[version])
    s.run({ type: 'event.edit', patch: { name: 'Revised plan' } })
    s.run({ type: 'activity.put', activity: { ...old.editing!.baseline.activities[0], durationMinutes: 60 } })
    expect(canonical(s.controller.getSnapshot().document!.baselineVersions[version])).toBe(saved)
    s.run({ type: 'baseline.apply', expectedVersion: version })
    const now = s.controller.getSnapshot()
    expect(now.document!.currentBaselineVersion).not.toBe(version)
    expect(canonical(now.document!.baselineVersions[version])).toBe(saved)
    expect(now.document!.activeIncidentId).toBeNull(); expect(selectWorkspace(now).selected).toBeNull()
    const history = selectHistoricalIncident(now, s.incidentId)
    expect(history.ok && history.value.historical).toBe(true)
    expect(history.ok && history.value.result.activityTimings.doors.finishMinute).toBe(660)
  })
  it('rejects a stale baseline apply and incident draft without changing source', () => {
    const s = setup(), before = s.controller.getSnapshot()
    expect(s.controller.dispatch({ type: 'baseline.apply', expectedVersion: 'old' }).ok).toBe(false)
    expect(s.controller.dispatch({ type: 'incident.configure', draft: { baselineVersion: 'old', targetActivityId: 'power', startDelayMinutes: 240, title: 'Old context', description: null } }).ok).toBe(false)
    expect(s.controller.getSnapshot().document).toEqual(before.document)
    expect(s.controller.getSnapshot().editing).toEqual(before.editing)
  })
  it('validates drafts explicitly and never applies through validation', () => {
    const s = setup(), version = s.controller.getSnapshot().document!.currentBaselineVersion
    s.run({ type: 'event.edit', patch: { description: 'Draft notes' } })
    s.run({ type: 'baseline.validate' })
    expect(s.controller.getSnapshot().baselineValidation).toBe('valid')
    expect(s.controller.getSnapshot().document!.currentBaselineVersion).toBe(version)
    expect(selectWorkspace(s.controller.getSnapshot()).baselineDirty).toBe(true)
  })
  it('supports explicit restore of a historical revision to the draft', () => {
    const s = setup(), first = s.controller.getSnapshot().document!.currentBaselineVersion!
    s.run({ type: 'event.edit', patch: { name: 'Second' } }); s.run({ type: 'baseline.apply', expectedVersion: first })
    const second = s.controller.getSnapshot().document!.currentBaselineVersion
    s.run({ type: 'baseline.restoreDraft', version: first })
    expect(s.controller.getSnapshot().editing!.baseline.event.name).not.toBe('Second')
    expect(s.controller.getSnapshot().document!.currentBaselineVersion).toBe(second)
    expect(s.controller.dispatch({ type: 'baseline.restoreDraft', version: 'missing' }).ok).toBe(false)
  })
  it('does not apply incident typing and withholds previous results until explicit Apply', () => {
    const s = setup(), version = s.controller.getSnapshot().document!.currentBaselineVersion!
    s.run({ type: 'incident.configure', draft: { baselineVersion: version, targetActivityId: 'power', startDelayMinutes: 240, title: 'Vendor', description: null } })
    expect(s.controller.getSnapshot().document!.activeIncidentId).toBeNull()
    expect(selectWorkspace(s.controller.getSnapshot()).impact).toBeNull()
    s.run({ type: 'incident.apply', expectedVersion: version, createdAt: metadata().createdAt })
    expect(selectWorkspace(s.controller.getSnapshot()).impact!.activityTimings.doors.finishMinute).toBe(660)
  })
  it.each([-1, 0.5, NaN, 10081])('retains invalid incident draft %s without applying it', delay => {
    const s = setup(), version = s.controller.getSnapshot().document!.currentBaselineVersion!
    s.run({ type: 'incident.configure', draft: { baselineVersion: version, targetActivityId: 'power', startDelayMinutes: delay, title: 'Vendor', description: null } })
    expect(s.controller.dispatch({ type: 'incident.apply', expectedVersion: version, createdAt: metadata().createdAt }).ok).toBe(false)
    expect(s.controller.getSnapshot().document!.activeIncidentId).toBeNull()
    expect(s.controller.getSnapshot().editing!.incident!.startDelayMinutes).toBe(delay)
  })
  it('resets a dirty active incident only after confirmation, preserving history and baseline', () => {
    const s = selected(), original = s.controller.getSnapshot().document!, oldIncident = original.activeIncidentId!
    s.run({ type: 'incident.configure', draft: { ...s.controller.getSnapshot().editing!.incident!, startDelayMinutes: 120 } })
    expect(s.controller.dispatch({ type: 'incident.reset', expectedIncidentId: oldIncident, createdAt: metadata().createdAt, confirmed: false }).ok).toBe(false)
    s.run({ type: 'incident.reset', expectedIncidentId: oldIncident, createdAt: metadata().createdAt, confirmed: true })
    const after = s.controller.getSnapshot(), view = selectWorkspace(after)
    expect(after.document!.baselineVersions).toEqual(original.baselineVersions)
    expect(after.document!.incidents[oldIncident]).toEqual(original.incidents[oldIncident])
    expect(after.document!.activeIncidentId).not.toBe(oldIncident)
    expect(after.editing!.incident!.startDelayMinutes).toBe(0)
    expect(view.incidentStatus).toBe('none'); expect(view.impact!.activityTimings.doors.finishMinute).toBe(540)
    expect(view.optionResults).toEqual([]); expect(view.selected).toBeNull()
  })
  it('requires explicit milestone reconciliation on activity deletion and removes edges atomically', () => {
    const s = setup(), before = s.controller.getSnapshot()
    expect(s.controller.dispatch({ type: 'activity.remove', id: 'doors' })).toMatchObject({ ok: false, errors: [{ code: 'MILESTONE_RECONCILIATION_REQUIRED' }] })
    expect(s.controller.getSnapshot().editing).toEqual(before.editing)
    s.run({ type: 'activity.remove', id: 'doors', milestoneReplacements: [{ ...before.editing!.baseline.milestones[0], activityId: 'rehearsal' }] })
    expect(s.controller.getSnapshot().editing!.baseline.dependencies.some(d => d.successorId === 'doors')).toBe(false)
    expect(s.controller.getSnapshot().editing!.baseline.milestones[0].activityId).toBe('rehearsal')
    expect(s.controller.getSnapshot().document!.baselineVersions).toEqual(before.document!.baselineVersions)
  })
  it('supports dependency/milestone editing and rejects invalid graph application', () => {
    const s = setup(), version = s.controller.getSnapshot().document!.currentBaselineVersion!
    s.run({ type: 'dependency.put', dependency: { id: 'cycle', eventId: 'launch', predecessorId: 'doors', successorId: 'power', type: 'finish_to_start', lagMinutes: 0 } })
    expect(s.controller.dispatch({ type: 'baseline.validate' }).ok).toBe(false)
    s.run({ type: 'dependency.remove', id: 'cycle' }); s.run({ type: 'milestone.remove', id: 'doors-deadline' })
    expect(s.controller.dispatch({ type: 'baseline.apply', expectedVersion: version }).ok).toBe(false)
    s.run({ type: 'milestone.put', milestone: source('corporate-launch-baseline').baseline.milestones[0] })
    s.run({ type: 'baseline.apply', expectedVersion: version })
  })
})

describe('recovery, approval and selection integrity', () => {
  it('requires supplied confirmation context when creating an option as well as editing it', () => {
    const s = setup(), incidentId = s.applyIncident(), request = source('figma-option-a-unknown-cost')
    if (request.kind !== 'recovery') throw new Error('Fixture')
    const before = s.controller.getSnapshot()
    expect(s.controller.dispatch({ type: 'recovery.add', expectedIncidentId: incidentId, option: { ...request.recovery, approvalStatus: 'confirmed', approvalContext: null } })).toMatchObject({ ok: false, errors: [{ code: 'APPROVAL_CONTEXT_REQUIRED' }] })
    expect(s.controller.getSnapshot().editing).toEqual(before.editing)
    expect(s.controller.getSnapshot().document).toEqual(before.document)
  })
  it('stages modifications, applies independent options, and clears stale selection after edits', () => {
    const s = selected()
    s.run({ type: 'recovery.modification.put', expectedIncidentId: s.incidentId, id: s.a, modification: { activityId: 'power', field: 'earliest_start', operation: 'set', valueMinutes: 180 } })
    expect(selectWorkspace(s.controller.getSnapshot()).selected).toBeNull(); expect(selectWorkspace(s.controller.getSnapshot()).briefReady).toBe(false)
    expect(s.controller.getSnapshot().document!.recoveryOptions[s.a].modifications[0].valueMinutes).toBe(120)
    s.run({ type: 'recovery.apply', expectedIncidentId: s.incidentId, id: s.a })
    s.run({ type: 'recovery.compare', expectedIncidentId: s.incidentId })
    expect(selectWorkspace(s.controller.getSnapshot()).optionResults[1].result).toMatchObject({ ok: true, value: { activityTimings: { doors: { finishMinute: 600 } } } })
  })
  it('removes a staged modification and keeps baseline source untouched', () => {
    const s = selected(), baseline = s.controller.getSnapshot().document!.baselineVersions
    s.run({ type: 'recovery.modification.remove', expectedIncidentId: s.incidentId, id: s.a, activityId: 'power', field: 'earliest_start' })
    expect(s.controller.getSnapshot().editing!.recoveries[s.a].modifications).toEqual([])
    expect(s.controller.getSnapshot().document!.baselineVersions).toEqual(baseline)
  })
  it('rejects protected shortening while retaining its option draft and baseline validity', () => {
    const s = selected(), original = s.controller.getSnapshot().document
    s.run({ type: 'recovery.modification.put', expectedIncidentId: s.incidentId, id: s.a, modification: { activityId: 'testing', field: 'duration', operation: 'set', valueMinutes: 30 } })
    const draft = s.controller.getSnapshot().editing
    expect(s.controller.dispatch({ type: 'recovery.apply', expectedIncidentId: s.incidentId, id: s.a }).ok).toBe(false)
    expect(s.controller.getSnapshot().editing).toEqual(draft)
    expect(s.controller.getSnapshot().document!.baselineVersions).toEqual(original!.baselineVersions)
    expect(s.controller.getSnapshot().baselineValidation).not.toBe('invalid')
  })
  it.each(['recovery.approval', 'recovery.edit'])('cannot confirm without supplied context via %s', type => {
    const s = selected(), before = s.controller.getSnapshot()
    const command = type === 'recovery.approval' ? { type: 'recovery.approval' as const, expectedIncidentId: s.incidentId, id: s.a, approvalStatus: 'confirmed' as const, context: '' } : { type: 'recovery.edit' as const, expectedIncidentId: s.incidentId, id: s.a, patch: { approvalStatus: 'confirmed' as const, approvalContext: null } }
    expect(s.controller.dispatch(command)).toMatchObject({ ok: false, errors: [{ code: 'APPROVAL_CONTEXT_REQUIRED' }] })
    expect(s.controller.getSnapshot().document).toEqual(before.document)
    expect(s.controller.getSnapshot().editing).toEqual(before.editing)
  })
  it('records externally supplied confirmation only through explicit edit/apply', () => {
    const s = selected()
    s.run({ type: 'recovery.approval', expectedIncidentId: s.incidentId, id: s.a, approvalStatus: 'confirmed', context: 'Vendor confirmed externally by the production manager.' })
    expect(s.controller.getSnapshot().document!.recoveryOptions[s.a].approvalStatus).toBe('pending')
    s.run({ type: 'recovery.apply', expectedIncidentId: s.incidentId, id: s.a })
    expect(s.controller.getSnapshot().document!.recoveryOptions[s.a].approvalStatus).toBe('confirmed')
    expect(s.controller.getSnapshot().document!.recoveryOptions[s.b].approvalStatus).toBe('pending')
  })
  it('distinguishes unknown, explicit zero and malformed cost without inventing amounts', () => {
    const s = selected()
    s.run({ type: 'recovery.cost', expectedIncidentId: s.incidentId, id: s.a, draft: { kind: 'editing', text: '0' } })
    s.run({ type: 'recovery.apply', expectedIncidentId: s.incidentId, id: s.a })
    expect(s.controller.getSnapshot().document!.recoveryOptions[s.a].costMinorUnits).toBe(0)
    s.run({ type: 'recovery.cost', expectedIncidentId: s.incidentId, id: s.a, draft: { kind: 'not_entered' } })
    expect(s.controller.getSnapshot().editing!.recoveries[s.a].costMinorUnits).toBeNull()
    const before = s.controller.getSnapshot()
    expect(s.controller.dispatch({ type: 'recovery.cost', expectedIncidentId: s.incidentId, id: s.a, draft: { kind: 'editing', text: '-' } }).ok).toBe(false)
    expect(s.controller.getSnapshot().editing).toEqual(before.editing)
  })
  it('rejects stale incident commands without partially editing options', () => {
    const s = selected(), before = s.controller.getSnapshot()
    expect(s.controller.dispatch({ type: 'selection.set', expectedIncidentId: 'old', id: s.a }).ok).toBe(false)
    expect(s.controller.dispatch({ type: 'recovery.edit', expectedIncidentId: 'old', id: s.a, patch: { costMinorUnits: 0 } }).ok).toBe(false)
    expect(s.controller.getSnapshot().document).toEqual(before.document)
    expect(s.controller.getSnapshot().editing).toEqual(before.editing)
  })
  it('selects idempotently, never approves, and supports explicit clear', () => {
    const s = selected(), before = s.controller.getSnapshot()
    s.run({ type: 'selection.set', expectedIncidentId: s.incidentId, id: s.a })
    expect(s.controller.getSnapshot()).toBe(before)
    s.run({ type: 'selection.set', expectedIncidentId: s.incidentId, id: s.b })
    expect(s.controller.getSnapshot().document!.recoveryOptions[s.a].status).toBe('draft')
    expect(s.controller.getSnapshot().document!.recoveryOptions[s.b].approvalStatus).toBe('pending')
    s.run({ type: 'selection.clear', expectedIncidentId: s.incidentId })
    expect(selectWorkspace(s.controller.getSnapshot()).selected).toBeNull()
  })
  it('limits active alternatives to three and allows explicit removal', () => {
    const s = selected(); const third = s.addOption('figma-option-a-unknown-cost')
    const request = source('figma-option-a-unknown-cost'); if (request.kind !== 'recovery') throw new Error('Fixture')
    expect(s.controller.dispatch({ type: 'recovery.add', expectedIncidentId: s.incidentId, option: request.recovery }).ok).toBe(false)
    s.run({ type: 'recovery.remove', expectedIncidentId: s.incidentId, id: third })
    expect(s.controller.getSnapshot().document!.recoveryOptions[third]).toBeUndefined()
  })
  it('requires comparison and explicit selection before preparing a brief', () => {
    const s = setup(), ids = s.canonical()
    expect(s.controller.dispatch({ type: 'brief.prepare', expectedIncidentId: ids.incidentId, metadata: metadata() }).ok).toBe(false)
    expect(s.controller.dispatch({ type: 'selection.set', expectedIncidentId: ids.incidentId, id: 'missing' }).ok).toBe(false)
  })
  it('preserves frozen brief content when source options are later edited or removed', () => {
    const s = selected(); s.run({ type: 'brief.prepare', expectedIncidentId: s.incidentId, metadata: metadata() })
    const brief = canonical(s.controller.getSnapshot().document!.decisionBriefs[0])
    s.run({ type: 'recovery.edit', expectedIncidentId: s.incidentId, id: s.a, patch: { costMinorUnits: 12345 } })
    s.run({ type: 'recovery.apply', expectedIncidentId: s.incidentId, id: s.a })
    s.run({ type: 'recovery.remove', expectedIncidentId: s.incidentId, id: s.b })
    expect(canonical(s.controller.getSnapshot().document!.decisionBriefs[0])).toBe(brief)
    expect(validateDocument(s.controller.getSnapshot().document).ok).toBe(true)
  })
})

describe('determinism and subscription boundary', () => {
  it('detaches command input and freezes nested state snapshots', () => {
    const state = emptyState(), event = structuredClone(source('corporate-launch-baseline').baseline.event)
    const command = { type: 'event.create' as const, event, currency: 'USD' }
    const first = execute(state, command), second = execute(state, command)
    expect(first).toEqual(second)
    if (!first.ok) throw new Error('Create failed')
    Object.assign(event, { name: 'Mutated caller' })
    expect(first.state.editing!.baseline.event.name).not.toBe('Mutated caller')
    expect(() => Object.assign(first.state.editing!.baseline.event, { name: 'Overwrite' })).toThrow()
  })
  it('notifies real validation/apply work, supports unsubscribe, and has no React requirement', () => {
    const s = setup(), statuses: string[] = []
    const unsubscribe = s.controller.subscribe(() => statuses.push(s.controller.getSnapshot().calculation.status))
    s.run({ type: 'baseline.validate' }); expect(statuses).toContain('validating')
    const count = statuses.length; unsubscribe(); s.run({ type: 'event.edit', patch: { description: 'Next' } })
    expect(statuses).toHaveLength(count)
  })
})
