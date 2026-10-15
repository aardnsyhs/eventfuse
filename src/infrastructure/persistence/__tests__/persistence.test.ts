import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApplicationController } from '../../../application/controller'
import { execute, restoreState } from '../../../application/commands'
import { persistable, validateDocument } from '../../../application/validation'
import { selectWorkspace } from '../../../application/selectors'
import type { AppResult, WorkspaceDocument } from '../../../application/types'
import { metadata, setup } from '../../../application/__tests__/helpers'
import { createBrowserPersistence, createLocalPersistence, decodeDocument, encodeDocument, MAX_DOCUMENT_BYTES, storageKey } from '../local-storage'
import type { LockPort } from '../local-storage'
import { createMemoryLocks, MemoryStorage } from '../memory'

const value = <T>(r: AppResult<T>): T => { expect(r.ok, JSON.stringify(r)).toBe(true); if (!r.ok) throw new Error('Expected success'); return r.value }
const code = (r: AppResult<unknown>) => r.ok ? null : r.errors[0].code
const document = (s: ReturnType<typeof setup>) => value(persistable(s.controller.getSnapshot()))
const environment = () => { const storage = new MemoryStorage(), locks = createMemoryLocks(); return { storage, locks, port: createLocalPersistence(storage, locks) } }
const deferred = () => { let resolve!: () => void; const promise = new Promise<void>(r => { resolve = r }); return { promise, resolve } }
type Mutable<T> = T extends readonly (infer U)[] ? Mutable<U>[] : T extends object ? { -readonly [K in keyof T]: Mutable<T[K]> } : T
afterEach(() => vi.unstubAllGlobals())

describe('source serialization and runtime hydration', () => {
  it('round trips selected pending/null-cost options and a conditional historical brief; recomputes engine output', async () => {
    const { port, storage } = environment()
    const s = setup({ persistence: port, nextStorageRevision: () => 'write-1' })
    const { incidentId, a } = s.canonical()
    s.run({ type: 'selection.set', expectedIncidentId: incidentId, id: a })
    s.run({ type: 'brief.prepare', expectedIncidentId: incidentId, metadata: metadata() })
    const before = selectWorkspace(s.controller.getSnapshot())
    value(await s.controller.save())
    const raw = storage.getItem(storageKey('workspace', 'launch'))!
    expect(JSON.parse(raw)).not.toHaveProperty('calculation')
    const restored = createApplicationController({ persistence: port })
    value(await restored.load('workspace', 'launch'))
    const after = selectWorkspace(restored.getSnapshot())
    expect(after.baselineResult).toEqual(before.baselineResult)
    expect(after.impact).toEqual(before.impact)
    expect(after.comparison).toEqual(before.comparison)
    expect(after.selected?.id).toBe(a)
    expect(after.selected?.costMinorUnits).toBeNull()
    expect(after.selected?.approvalStatus).toBe('pending')
    expect(after.briefView).toEqual(before.briefView)
    expect(after.briefReady).toBe(true)
    expect(after.dirty).toBe(false)
    expect(Object.isFrozen(restored.getSnapshot().document!.baselineVersions)).toBe(true)
    expect(storage.writes).toBe(1)
  })

  it('saves a valid unapplied draft without changing committed source, and restores it as dirty', async () => {
    const { port } = environment(), s = setup({ persistence: port, nextStorageRevision: () => 'draft-write' })
    const version = s.controller.getSnapshot().document!.currentBaselineVersion!
    s.run({ type: 'event.edit', patch: { name: 'Unapplied name' } })
    value(await s.controller.save())
    const restored = createApplicationController({ persistence: port })
    value(await restored.load('workspace', 'launch'))
    const state = restored.getSnapshot()
    expect(state.editing!.baseline.event.name).toBe('Unapplied name')
    expect(state.document!.baselineVersions[version].event.name).not.toBe('Unapplied name')
    expect(selectWorkspace(state).baselineDirty).toBe(true)
    expect(selectWorkspace(state).baselineResult).toBeNull()
  })

  it('persists a valid event draft with no milestones, but never claims to save invalid input', async () => {
    const { port, storage } = environment(), s = setup({ persistence: port, nextStorageRevision: () => 'valid-write' })
    value(await s.controller.save())
    const before = storage.getItem(storageKey('workspace', 'launch'))
    s.run({ type: 'event.edit', patch: { name: '' } })
    expect(code(await s.controller.save())).toBe('VALIDATION')
    expect(s.controller.getSnapshot().editing!.baseline.event.name).toBe('')
    expect(selectWorkspace(s.controller.getSnapshot()).dirty).toBe(true)
    expect(storage.getItem(storageKey('workspace', 'launch'))).toBe(before)
    const draft = createApplicationController({ persistence: port, nextStorageRevision: () => 'empty-write' })
    const event = s.controller.getSnapshot().editing!.baseline.event
    expect(draft.dispatch({ type: 'event.create', event: { ...event, id: 'draft', name: 'Draft' }, currency: 'USD' }).ok).toBe(true)
    value(await draft.save())
    expect(value(await port.load('workspace', 'draft'))!.currentBaselineVersion).toBeNull()
  })

  it('restores unapplied incident and option drafts without applying their changes', async () => {
    const { port } = environment(); let token = 0
    const s = setup({ persistence: port, nextStorageRevision: () => `draft-${++token}` })
    const { incidentId, a } = s.canonical()
    s.run({ type: 'recovery.edit', expectedIncidentId: incidentId, id: a, patch: { costMinorUnits: 0 } })
    value(await s.controller.save())
    const restored = createApplicationController({ persistence: port })
    value(await restored.load('workspace', 'launch'))
    expect(restored.getSnapshot().editing!.recoveries[a].costMinorUnits).toBe(0)
    expect(restored.getSnapshot().document!.recoveryOptions[a].costMinorUnits).toBeNull()
    expect(selectWorkspace(restored.getSnapshot()).comparison).toBeNull()
    expect(restored.dispatch({ type: 'recovery.apply', expectedIncidentId: incidentId, id: a }).ok).toBe(true)
    expect(restored.dispatch({ type: 'recovery.compare', expectedIncidentId: incidentId }).ok).toBe(true)
    expect(selectWorkspace(restored.getSnapshot()).optionResults).toHaveLength(2)
    s.run({ type: 'incident.configure', draft: { ...s.controller.getSnapshot().editing!.incident!, startDelayMinutes: 120 } })
    value(await s.controller.save())
    value(await restored.load('workspace', 'launch', true))
    expect(restored.getSnapshot().editing!.incident!.startDelayMinutes).toBe(120)
    expect(restored.getSnapshot().document!.incidents[incidentId].startDelayMinutes).toBe(240)
    expect(selectWorkspace(restored.getSnapshot()).impact).toBeNull()
  })

  it.each([
    ['schema version', (d: Record<string, unknown>) => { d.schemaVersion = 2 }, 'UNSUPPORTED_SCHEMA'],
    ['missing version', (d: Record<string, unknown>) => { delete d.schemaVersion }, 'INVALID_DOCUMENT'],
    ['missing map', (d: Record<string, unknown>) => { delete d.incidents }, 'INVALID_DOCUMENT'],
    ['unexpected cache', (d: Record<string, unknown>) => { d.results = {} }, 'INVALID_DOCUMENT'],
    ['missing revision', (d: Record<string, unknown>) => { d.currentBaselineVersion = 'missing' }, 'INVALID_DOCUMENT'],
    ['missing incident', (d: Record<string, unknown>) => { d.activeIncidentId = 'missing' }, 'INVALID_DOCUMENT'],
    ['bad selection', (d: Record<string, unknown>) => { d.selectedOptionByIncident = { missing: 'option' } }, 'INVALID_DOCUMENT'],
    ['prototype key', (d: Record<string, unknown>) => { d.incidents = JSON.parse('{"__proto__":{}}') }, 'INVALID_DOCUMENT'],
    ['unsafe sequence', (d: Record<string, unknown>) => { d.nextSequence = Number.MAX_SAFE_INTEGER }, 'INVALID_DOCUMENT'],
    ['changed limits', (d: Record<string, unknown>) => { d.limits = {} }, 'INVALID_DOCUMENT'],
  ])('rejects %s without overwriting stored bytes', async (_, corrupt, expected) => {
    const { port, storage } = environment(), d = structuredClone(document(setup())) as unknown as Record<string, unknown>
    corrupt(d)
    const raw = JSON.stringify(d), key = storageKey('workspace', 'launch')
    storage.setItem(key, raw)
    expect(code(await port.load('workspace', 'launch'))).toBe(expected)
    expect((await port.save(document(setup()), null, 'replacement')).ok).toBe(false)
    expect(storage.getItem(key)).toBe(raw)
    expect(storage.writes).toBe(1)
  })

  it('rejects malformed, null and oversized input before accepting any source', () => {
    expect(code(decodeDocument('{bad'))).toBe('STORAGE_CORRUPT')
    expect(code(decodeDocument('null'))).toBe('INVALID_DOCUMENT')
    expect(code(decodeDocument(' '.repeat(MAX_DOCUMENT_BYTES / 2 + 1)))).toBe('STORAGE_TOO_LARGE')
    const d = document(setup())
    expect(code(encodeDocument({ ...d, editing: { ...d.editing, baseline: { ...d.editing.baseline, event: { ...d.editing.baseline.event, name: 'x'.repeat(MAX_DOCUMENT_BYTES) } } } }))).not.toBeNull()
  })

  it('validates each option reference, approval context, preference and brief snapshot against real engine source', () => {
    const s = setup(), { incidentId, a } = s.canonical()
    s.run({ type: 'selection.set', expectedIncidentId: incidentId, id: a })
    s.run({ type: 'brief.prepare', expectedIncidentId: incidentId, metadata: metadata() })
    const d = document(s)
    const mutate = (change: (d: Mutable<WorkspaceDocument>) => void) => { const copy = structuredClone(d) as Mutable<WorkspaceDocument>; change(copy); expect(validateDocument(copy).ok).toBe(false) }
    mutate(d => { d.recoveryOptions[a].incidentId = 'missing' })
    mutate(d => { d.recoveryOptions[a].approvalStatus = 'confirmed'; d.recoveryOptions[a].approvalContext = null })
    mutate(d => { d.recoveryOptions[a].status = 'draft' })
    mutate(d => { d.decisionBriefs[0].selectedRecoveryOptionId = 'missing' })
    mutate(d => { d.decisionBriefs[0].baselineSnapshot.activityTimings.doors.finishMinute++ })
    mutate(d => { d.decisionBriefs[0].comparisonResultSnapshots[0].activityTimings.doors.finishMinute++ })
    mutate(d => { d.decisionBriefs.push(d.decisionBriefs[0]) })
  })

  it('checks storage-key identity during load, catalog listing and save', async () => {
    const { storage, port } = environment(), other = document(setup({}, 'demo', 'other'))
    storage.setItem(storageKey('workspace', 'launch'), value(encodeDocument(other)))
    expect(code(await port.load('workspace', 'launch'))).toBe('INVALID_DOCUMENT')
    expect(code(await port.list('workspace'))).toBe('INVALID_DOCUMENT')
    expect(code(await port.save(document(setup()), 'unsaved', 'new-token'))).toBe('INVALID_DOCUMENT')
    expect(storage.writes).toBe(1)
  })
})

describe('storage failures and concurrency', () => {
  it('keeps multiple events and demo/workspace namespaces independent, with deterministic catalogs', async () => {
    const { port, storage } = environment()
    for (const [namespace, id] of [['workspace', 'z'], ['workspace', 'a'], ['demo', 'a']] as const) value(await port.save(document(setup({}, namespace, id)), null, `${namespace}-${id}`))
    expect(value(await port.list('workspace')).map(e => e.eventId)).toEqual(['a', 'z'])
    expect(value(await port.list('demo')).map(e => e.eventId)).toEqual(['a'])
    expect(storage.length).toBe(3)
    expect(await port.load('workspace', 'missing')).toEqual({ ok: true, value: null })
    expect(code(await port.load('workspace', '__proto__'))).toBe('INVALID_INPUT')
  })

  it.each(['QuotaExceededError', 'SecurityError'])('preserves memory and prior saved bytes following %s', async name => {
    const { port, storage } = environment(); let sequence = 0
    const s = setup({ persistence: port, nextStorageRevision: () => `token-${++sequence}` })
    value(await s.controller.save())
    const before = storage.getItem(storageKey('workspace', 'launch'))
    s.run({ type: 'event.edit', patch: { name: 'Keep this edit' } })
    storage.writeError = Object.assign(new Error('Unavailable'), { name })
    expect(code(await s.controller.save())).toBe(name === 'QuotaExceededError' ? 'STORAGE_QUOTA' : 'STORAGE_UNAVAILABLE')
    expect(s.controller.getSnapshot().editing!.baseline.event.name).toBe('Keep this edit')
    expect(s.controller.getSnapshot().persistence.expectedRevision).toBe('token-1')
    expect(storage.getItem(storageKey('workspace', 'launch'))).toBe(before)
    expect(selectWorkspace(s.controller.getSnapshot()).status).toBe('storage-error')
    storage.writeError = null
    value(await s.controller.save())
    expect(s.controller.getSnapshot().persistence.status).toBe('saved')
  })

  it('returns read and lock failures, and never writes without an exclusive lock', async () => {
    const { storage } = environment(), d = document(setup())
    expect(code(await createLocalPersistence(storage).save(d, null, 't1'))).toBe('LOCK_UNAVAILABLE')
    expect(storage.writes).toBe(0)
    const locks: LockPort = { exclusive: async () => { throw new Error('Lock denied') } }
    expect(code(await createLocalPersistence(storage, locks).save(d, null, 't2'))).toBe('STORAGE_UNAVAILABLE')
    storage.readError = new Error('Read denied')
    const port = createLocalPersistence(storage, createMemoryLocks())
    expect(code(await port.load('workspace', 'launch'))).toBe('STORAGE_UNAVAILABLE')
    expect(code(await port.list('workspace'))).toBe('STORAGE_UNAVAILABLE')
    expect(code(await port.save(d, null, 't3'))).toBe('STORAGE_UNAVAILABLE')
    expect(storage.writes).toBe(0)
  })

  it('detects stale, removed-record and reused-token writes without touching the winner', async () => {
    const { port, storage } = environment(), d = document(setup())
    expect(code(await port.save(d, 'removed-token', 't1'))).toBe('STORAGE_CONFLICT')
    value(await port.save(d, null, 't1'))
    const raw = storage.getItem(storageKey('workspace', 'launch'))
    expect(code(await port.save(d, null, 't2'))).toBe('STORAGE_CONFLICT')
    expect(code(await port.save(d, 'old', 't3'))).toBe('STORAGE_CONFLICT')
    expect(code(await port.save(d, 't1', 't1'))).toBe('INVALID_INPUT')
    expect(storage.getItem(storageKey('workspace', 'launch'))).toBe(raw)
    expect(storage.writes).toBe(1)
  })

  it('serializes simultaneous saves and preserves the losing tab session', async () => {
    const { port, storage } = environment(), initial = setup({ persistence: port, nextStorageRevision: () => 'initial' })
    value(await initial.controller.save())
    const a = createApplicationController({ persistence: port, nextStorageRevision: () => 'tab-a' })
    const b = createApplicationController({ persistence: port, nextStorageRevision: () => 'tab-b' })
    value(await a.load('workspace', 'launch')); value(await b.load('workspace', 'launch'))
    a.dispatch({ type: 'event.edit', patch: { name: 'Tab A' } }); b.dispatch({ type: 'event.edit', patch: { name: 'Tab B' } })
    const results = await Promise.all([a.save(), b.save()])
    expect(results.map(code)).toEqual([null, 'STORAGE_CONFLICT'])
    expect(value(await port.load('workspace', 'launch'))!.editing.baseline.event.name).toBe('Tab A')
    expect(b.getSnapshot().editing!.baseline.event.name).toBe('Tab B')
    expect(b.getSnapshot().persistence.status).toBe('error')
    expect(storage.writes).toBe(2)
  })

  it('preserves edits made during an actual pending save, and prevents overlapping persistence operations', async () => {
    const storage = new MemoryStorage(), gate = deferred(), entered = deferred()
    const locks: LockPort = { exclusive: async (_, work) => { entered.resolve(); await gate.promise; return work() } }
    let sequence = 0
    const s = setup({ persistence: createLocalPersistence(storage, locks), nextStorageRevision: () => `write-${++sequence}` })
    const pending = s.controller.save(); await entered.promise
    expect(selectWorkspace(s.controller.getSnapshot()).status).toBe('saving')
    expect(code(await s.controller.save())).toBe('STORAGE_BUSY')
    expect(code(await s.controller.load('workspace', 'launch', true))).toBe('STORAGE_BUSY')
    s.run({ type: 'event.edit', patch: { name: 'New input during save' } })
    gate.resolve(); value(await pending)
    expect(s.controller.getSnapshot().editing!.baseline.event.name).toBe('New input during save')
    expect(s.controller.getSnapshot().persistence.status).toBe('unsaved')
    expect(s.controller.getSnapshot().persistence.expectedRevision).toBe('write-1')
    expect(value(decodeDocument(storage.getItem(storageKey('workspace', 'launch'))!)).editing.baseline.event.name).not.toBe('New input during save')
    value(await s.controller.save())
    expect(s.controller.getSnapshot().persistence.status).toBe('saved')
  })

  it('guards restore replacement, preserves corruption, and blocks commands while loading', async () => {
    const { port, storage } = environment(), s = setup({ persistence: port, nextStorageRevision: () => 'initial' })
    expect(code(await s.controller.load('workspace', 'launch'))).toBe('UNSAVED_CHANGES')
    value(await s.controller.save())
    storage.setItem(storageKey('workspace', 'launch'), '{broken')
    const before = s.controller.getSnapshot().document
    expect(code(await s.controller.load('workspace', 'launch'))).toBe('STORAGE_CORRUPT')
    expect(s.controller.getSnapshot().document).toBe(before)
    expect(storage.getItem(storageKey('workspace', 'launch'))).toBe('{broken')
    const gate = deferred()
    const delayed = createApplicationController({ persistence: { ...port, load: async (...args) => { await gate.promise; return port.load(...args) } } })
    const pending = delayed.load('workspace', 'missing')
    expect(selectWorkspace(delayed.getSnapshot()).status).toBe('loading')
    expect(Object.values(selectWorkspace(delayed.getSnapshot()).actions).every(enabled => !enabled)).toBe(true)
    const command = delayed.dispatch({ type: 'baseline.validate' })
    expect(command.ok).toBe(false)
    if (!command.ok) expect(command.errors[0].code).toBe('STORAGE_BUSY')
    gate.resolve(); value(await pending)
    expect(delayed.getSnapshot().document).toBeNull()
    expect(delayed.getSnapshot().persistence.status).toBe('idle')
  })

  it('keeps demo reset isolated and makes clearing selection explicit', () => {
    const s = setup({}, 'demo'), seed = document(s), { incidentId, a } = s.canonical()
    s.run({ type: 'selection.set', expectedIncidentId: incidentId, id: a })
    s.run({ type: 'selection.clear', expectedIncidentId: incidentId })
    expect(selectWorkspace(s.controller.getSnapshot()).selected).toBeNull()
    expect(s.controller.dispatch({ type: 'demo.reset', seed, confirmed: false }).ok).toBe(false)
    s.run({ type: 'demo.reset', seed, confirmed: true })
    expect(s.controller.getSnapshot().document!.activeIncidentId).toBeNull()
    expect(s.controller.getSnapshot().document!.namespace).toBe('demo')
    const workspace = setup()
    expect(workspace.controller.dispatch({ type: 'demo.reset', seed, confirmed: true }).ok).toBe(false)
  })

  it('rejects reentrant commands during notifications without losing the outer transition', () => {
    const s = setup(); let nested: boolean | undefined
    s.controller.subscribe(() => { if (s.controller.getSnapshot().calculation.status === 'validating') nested = s.controller.dispatch({ type: 'event.edit', patch: { name: 'Reentrant edit' } }).ok })
    s.run({ type: 'baseline.validate' })
    expect(nested).toBe(false)
    expect(s.controller.getSnapshot().editing!.baseline.event.name).not.toBe('Reentrant edit')
  })

  it('handles unavailable factories and exposes browser storage through injected browser APIs', async () => {
    expect(code(createBrowserPersistence())).toBe('STORAGE_UNAVAILABLE')
    vi.stubGlobal('window', { get localStorage() { throw new Error('Denied') } })
    expect(code(createBrowserPersistence())).toBe('STORAGE_UNAVAILABLE')
    const storage = new MemoryStorage(), locks = createMemoryLocks()
    vi.stubGlobal('window', { localStorage: storage })
    vi.stubGlobal('navigator', { locks: { request: (name: string, _: unknown, work: () => Promise<unknown>) => locks.exclusive(name, work) } })
    const port = value(createBrowserPersistence())
    value(await port.save(document(setup()), null, 'browser-token'))
    expect(value(await port.load('workspace', 'launch'))!.storageRevision).toBe('browser-token')
  })

  it('returns structured sequence exhaustion rather than mutating applied revisions', () => {
    const s = setup(), d = document(s)
    const exhausted = restoreState({ ...d, nextSequence: Number.MAX_SAFE_INTEGER - 1 })
    const result = execute(exhausted, { type: 'baseline.apply', expectedVersion: d.currentBaselineVersion })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors[0].code).toBe('INVALID_INPUT')
    expect(result.state.document).toEqual(exhausted.document)
  })
})
