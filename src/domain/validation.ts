import type { Activity, BaselineSnapshot, CurrencyCode, Dependency, EngineLimits, Incident, RecoveryCostDraft, RecoveryOption } from './types'
import { DEFAULT_LIMITS, currencyExponent } from './index'
import { error, failure, success, type Result } from '../engine/errors'
import { validateGraph } from '../engine/graph'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const has = (value: Record<string, unknown>, key: string): boolean => Object.prototype.hasOwnProperty.call(value, key)
const isSafeInteger = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value)
const isString = (value: unknown): value is string => typeof value === 'string'
const isNullableString = (value: unknown): value is string | null => value === null || isString(value)
const idIsValid = (value: unknown): value is string => isString(value) && value.length > 0 && !['__proto__', 'constructor', 'prototype'].includes(value)
const isIsoInstant = (value: unknown): value is string => isString(value) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value) && !Number.isNaN(Date.parse(value))
const isIsoDate = (value: unknown): value is string => isString(value) && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
const isTimezone = (value: unknown): value is string => { if (!isString(value)) return false; try { new Intl.DateTimeFormat('en-US', { timeZone: value }).format(); return true } catch { return false } }
const arrayOf = (value: unknown): value is readonly unknown[] => Array.isArray(value)

const duplicateErrors = (values: readonly string[], path: string): ReturnType<typeof error>[] => {
  const seen = new Set<string>(); const errors: ReturnType<typeof error>[] = []
  values.forEach((value, index) => { if (seen.has(value)) errors.push(error('DUPLICATE_ID', `${path}/${index}/id`, 'Identifier must be unique.', value)); seen.add(value) })
  return errors
}

const validateEvent = (value: unknown, path: string): Result<BaselineSnapshot['event']> => {
  if (!isRecord(value)) return failure(error('INVALID_SHAPE', path, 'Event must be an object.'))
  const required = ['id','name','description','date','timezone','location','referenceInstant','createdAt','updatedAt','schemaVersion']
  const errors = required.filter((key) => !has(value, key)).map((key) => error('INVALID_SHAPE', `${path}/${key}`, 'Required field is missing.'))
  if (errors.length) return failure(...errors)
  if (!idIsValid(value.id)) errors.push(error('INVALID_TEXT', `${path}/id`, 'ID must be a non-empty safe string.'))
  if (!isString(value.name) || value.name.trim().length === 0) errors.push(error('INVALID_TEXT', `${path}/name`, 'Name must not be blank.'))
  if (!isNullableString(value.description) || !isNullableString(value.location)) errors.push(error('INVALID_SHAPE', path, 'Nullable text field is invalid.'))
  if (!isIsoDate(value.date)) errors.push(error('INVALID_DATE', `${path}/date`, 'Date must be a valid ISO date.'))
  if (!isTimezone(value.timezone)) errors.push(error('INVALID_TIMEZONE', `${path}/timezone`, 'Timezone must be a known IANA timezone.'))
  if (!isIsoInstant(value.referenceInstant) || !value.referenceInstant.endsWith(':00Z')) errors.push(error('INVALID_DATE', `${path}/referenceInstant`, 'Reference instant must be minute-aligned UTC.'))
  if (!isIsoInstant(value.createdAt) || !isIsoInstant(value.updatedAt)) errors.push(error('INVALID_DATE', path, 'Audit timestamps must be valid UTC instants.'))
  if (isIsoInstant(value.createdAt) && isIsoInstant(value.updatedAt) && Date.parse(value.updatedAt) < Date.parse(value.createdAt)) errors.push(error('INVALID_DATE', `${path}/updatedAt`, 'Updated time must not precede created time.'))
  if (value.schemaVersion !== 1) errors.push(error('UNSUPPORTED_SCHEMA', `${path}/schemaVersion`, 'Only schema version 1 is supported.'))
  return errors.length ? failure(...errors) : success(value as unknown as BaselineSnapshot['event'])
}

const validateActivity = (value: unknown, index: number, eventId: string, limits: EngineLimits): ReturnType<typeof success<Activity>> | ReturnType<typeof failure> => {
  const path = `/baseline/activities/${index}`
  if (!isRecord(value)) return failure(error('INVALID_SHAPE', path, 'Activity must be an object.'))
  const required = ['id','eventId','name','ownerName','earliestStartMinute','durationMinutes','classification','notes','isMilestone']
  const errors = required.filter((key) => !has(value, key)).map((key) => error('INVALID_SHAPE', `${path}/${key}`, 'Required field is missing.'))
  if (errors.length) return failure(...errors)
  if (!idIsValid(value.id)) errors.push(error('INVALID_TEXT', `${path}/id`, 'ID must be a non-empty safe string.'))
  if (value.eventId !== eventId) errors.push(error('EVENT_MISMATCH', `${path}/eventId`, 'Activity belongs to another event.', String(value.id)))
  if (!isString(value.name) || value.name.trim().length === 0) errors.push(error('INVALID_TEXT', `${path}/name`, 'Name must not be blank.'))
  if (!isNullableString(value.ownerName) || !isNullableString(value.notes)) errors.push(error('INVALID_SHAPE', path, 'Nullable text field is invalid.'))
  for (const [key, numberValue] of [['earliestStartMinute', value.earliestStartMinute], ['durationMinutes', value.durationMinutes]] as const) {
    if (!isSafeInteger(numberValue)) errors.push(error('INVALID_NUMBER', `${path}/${key}`, 'Value must be a safe integer.'))
    else if (numberValue < 0 || numberValue > limits.maxMinute) errors.push(error('OUT_OF_RANGE', `${path}/${key}`, 'Value is outside the configured minute range.'))
  }
  if (!['normal','approval_required','protected'].includes(String(value.classification))) errors.push(error('INVALID_SHAPE', `${path}/classification`, 'Unknown activity classification.'))
  if (typeof value.isMilestone !== 'boolean') errors.push(error('INVALID_SHAPE', `${path}/isMilestone`, 'Milestone flag must be boolean.'))
  if (value.isMilestone === true && value.durationMinutes !== 0) errors.push(error('MILESTONE_DURATION', `${path}/durationMinutes`, 'Milestones must have zero duration.', String(value.id)))
  return errors.length ? failure(...errors) : success(value as unknown as Activity)
}

const validateDependency = (value: unknown, index: number, eventId: string, activityIds: Set<string>, limits: EngineLimits): ReturnType<typeof success<Dependency>> | ReturnType<typeof failure> => {
  const path = `/baseline/dependencies/${index}`
  if (!isRecord(value)) return failure(error('INVALID_SHAPE', path, 'Dependency must be an object.'))
  const required = ['id','eventId','predecessorId','successorId','type','lagMinutes']
  const errors = required.filter((key) => !has(value, key)).map((key) => error('INVALID_SHAPE', `${path}/${key}`, 'Required field is missing.'))
  if (errors.length) return failure(...errors)
  if (!idIsValid(value.id)) errors.push(error('INVALID_TEXT', `${path}/id`, 'ID must be a non-empty safe string.'))
  if (value.eventId !== eventId) errors.push(error('EVENT_MISMATCH', `${path}/eventId`, 'Dependency belongs to another event.', String(value.id)))
  for (const [key, id] of [['predecessorId', value.predecessorId], ['successorId', value.successorId]] as const) if (!idIsValid(id) || !activityIds.has(id)) errors.push(error('INVALID_REFERENCE', `${path}/${key}`, 'Activity reference does not exist.', String(value.id), [String(id)]))
  if (value.predecessorId === value.successorId) errors.push(error('SELF_DEPENDENCY', path, 'An activity cannot depend on itself.', String(value.id), [String(value.predecessorId)]))
  if (value.type !== 'finish_to_start') errors.push(error('INVALID_SHAPE', `${path}/type`, 'Only finish-to-start dependencies are supported.'))
  if (!isSafeInteger(value.lagMinutes)) errors.push(error('INVALID_NUMBER', `${path}/lagMinutes`, 'Lag must be a safe integer.'))
  else if (value.lagMinutes < 0 || value.lagMinutes > limits.maxMinute) errors.push(error('OUT_OF_RANGE', `${path}/lagMinutes`, 'Lag is outside the configured range.'))
  return errors.length ? failure(...errors) : success(value as unknown as Dependency)
}

const validateMilestone = (value: unknown, index: number, eventId: string, activityIds: Set<string>, limits: EngineLimits): ReturnType<typeof success<BaselineSnapshot['milestones'][number]>> | ReturnType<typeof failure> => {
  const path = `/baseline/milestones/${index}`
  if (!isRecord(value)) return failure(error('INVALID_SHAPE', path, 'Milestone must be an object.'))
  const required = ['id','eventId','activityId','deadlineMinute','label']
  const errors = required.filter((key) => !has(value, key)).map((key) => error('INVALID_SHAPE', `${path}/${key}`, 'Required field is missing.'))
  if (errors.length) return failure(...errors)
  if (!idIsValid(value.id)) errors.push(error('INVALID_TEXT', `${path}/id`, 'ID must be a non-empty safe string.'))
  if (value.eventId !== eventId) errors.push(error('EVENT_MISMATCH', `${path}/eventId`, 'Milestone belongs to another event.', String(value.id)))
  if (!idIsValid(value.activityId) || !activityIds.has(value.activityId)) errors.push(error('INVALID_REFERENCE', `${path}/activityId`, 'Activity reference does not exist.', String(value.id), [String(value.activityId)]))
  if (!isSafeInteger(value.deadlineMinute)) errors.push(error('INVALID_NUMBER', `${path}/deadlineMinute`, 'Deadline must be a safe integer.'))
  else if (value.deadlineMinute < 0 || value.deadlineMinute > limits.maxMinute) errors.push(error('OUT_OF_RANGE', `${path}/deadlineMinute`, 'Deadline is outside the configured range.'))
  if (!isString(value.label) || value.label.trim().length === 0) errors.push(error('INVALID_TEXT', `${path}/label`, 'Label must not be blank.'))
  return errors.length ? failure(...errors) : success(value as unknown as BaselineSnapshot['milestones'][number])
}

export const validateBaseline = (input: unknown, mode: 'draft' | 'runnable', limits: EngineLimits = DEFAULT_LIMITS): Result<BaselineSnapshot> => {
  if (!isRecord(input)) return failure(error('INVALID_SHAPE', '/baseline', 'Baseline must be an object.'))
  const errors: ReturnType<typeof error>[] = []
  if (!idIsValid(input.baselineVersion)) errors.push(error('INVALID_TEXT', '/baseline/baselineVersion', 'Baseline version must be a non-empty safe string.'))
  const eventResult = validateEvent(input.event, '/baseline/event')
  if (!eventResult.ok) errors.push(...eventResult.errors)
  const eventId = eventResult.ok ? eventResult.value.id : ''
  if (!arrayOf(input.activities) || input.activities.length > limits.maxActivities) errors.push(error('LIMIT_EXCEEDED', '/baseline/activities', 'Activity limit exceeded.'))
  if (!arrayOf(input.dependencies) || input.dependencies.length > limits.maxDependencies) errors.push(error('LIMIT_EXCEEDED', '/baseline/dependencies', 'Dependency limit exceeded.'))
  if (!arrayOf(input.milestones) || input.milestones.length > limits.maxMilestones) errors.push(error('LIMIT_EXCEEDED', '/baseline/milestones', 'Milestone limit exceeded.'))
  const activities = arrayOf(input.activities) ? input.activities.map((value, index) => validateActivity(value, index, eventId, limits)) : []
  for (const result of activities) if (!result.ok) errors.push(...result.errors)
  const activityValues = activities.filter((result): result is { ok: true; value: Activity } => result.ok).map((result) => result.value)
  errors.push(...duplicateErrors(activityValues.map((activity) => activity.id), '/baseline/activities'))
  const activityIds = new Set(activityValues.map((activity) => activity.id))
  const dependencies = arrayOf(input.dependencies) ? input.dependencies.map((value, index) => validateDependency(value, index, eventId, activityIds, limits)) : []
  for (const result of dependencies) if (!result.ok) errors.push(...result.errors)
  const dependencyValues = dependencies.filter((result): result is { ok: true; value: Dependency } => result.ok).map((result) => result.value)
  errors.push(...duplicateErrors(dependencyValues.map((dependency) => dependency.id), '/baseline/dependencies'))
  const pairs = new Set<string>()
  dependencyValues.forEach((dependency, index) => { const pair = `${dependency.predecessorId}\u0000${dependency.successorId}`; if (pairs.has(pair)) errors.push(error('DUPLICATE_DEPENDENCY', `/baseline/dependencies/${index}`, 'Dependency pair must be unique.', dependency.id)); pairs.add(pair) })
  const milestones = arrayOf(input.milestones) ? input.milestones.map((value, index) => validateMilestone(value, index, eventId, activityIds, limits)) : []
  for (const result of milestones) if (!result.ok) errors.push(...result.errors)
  const milestoneValues = milestones.filter((result): result is { ok: true; value: BaselineSnapshot['milestones'][number] } => result.ok).map((result) => result.value)
  errors.push(...duplicateErrors(milestoneValues.map((milestone) => milestone.id), '/baseline/milestones'))
  if (mode === 'runnable' && activityValues.length === 0) errors.push(error('OUT_OF_RANGE', '/baseline/activities', 'Runnable baseline needs at least one activity.'))
  if (mode === 'runnable' && milestoneValues.length === 0) errors.push(error('OUT_OF_RANGE', '/baseline/milestones', 'Runnable baseline needs at least one critical milestone.'))
  if (errors.length) return failure(...errors)
  const baseline: BaselineSnapshot = { baselineVersion: input.baselineVersion as string, event: eventResult.ok ? eventResult.value : (() => { throw new Error('unreachable') })(), activities: activityValues, dependencies: dependencyValues, milestones: milestoneValues }
  const graphResult = validateGraph(baseline)
  return graphResult.ok ? success(baseline) : failure(...graphResult.errors)
}

export const validateCurrency = (currency: CurrencyCode, path = '/currency'): Result<number> => { const exponent = currencyExponent(currency); return exponent === null ? failure(error('UNKNOWN_CURRENCY', path, 'Currency is not supported.')) : success(exponent) }

export const parseRecoveryCost = (input: RecoveryCostDraft, currency: CurrencyCode): Result<number | null> => {
  const currencyResult = validateCurrency(currency)
  if (!currencyResult.ok) return currencyResult
  if (input.kind === 'not_entered' || input.text.trim() === '') return success(null)
  const text = input.text.trim(); const exponent = currencyResult.value
  const pattern = exponent === 0 ? /^\d+$/ : new RegExp(`^\\d+(?:\\.(\\d{1,${exponent}}))?$`)
  if (!pattern.test(text)) return failure(error('INVALID_NUMBER', '/costDraft/text', 'Cost must be a non-negative decimal amount.'))
  const [whole, fraction = ''] = text.split('.')
  const minorText = `${whole}${fraction.padEnd(exponent, '0')}`
  const amount = Number(minorText)
  return Number.isSafeInteger(amount) ? success(amount) : failure(error('OUT_OF_RANGE', '/costDraft/text', 'Cost exceeds the safe integer range.'))
}

export const validateIncident = (value: unknown, baseline: BaselineSnapshot, path = '/incident'): Result<Incident> => {
  if (!isRecord(value)) return failure(error('INVALID_SHAPE', path, 'Incident must be an object.'))
  const errors: ReturnType<typeof error>[] = []
  for (const key of ['id','eventId','baselineVersion','title','description','targetActivityId','startDelayMinutes','createdAt']) if (!has(value, key)) errors.push(error('INVALID_SHAPE', `${path}/${key}`, 'Required field is missing.'))
  if (!idIsValid(value.id)) errors.push(error('INVALID_TEXT', `${path}/id`, 'ID is invalid.'))
  if (value.eventId !== baseline.event.id) errors.push(error('EVENT_MISMATCH', `${path}/eventId`, 'Incident belongs to another event.', String(value.id)))
  if (value.baselineVersion !== baseline.baselineVersion) errors.push(error('STALE_BASELINE', `${path}/baselineVersion`, 'Incident references another baseline revision.', String(value.id)))
  if (!isString(value.title) || value.title.trim() === '') errors.push(error('INVALID_TEXT', `${path}/title`, 'Title must not be blank.'))
  if (!isNullableString(value.description)) errors.push(error('INVALID_SHAPE', `${path}/description`, 'Description must be text or null.'))
  if (!idIsValid(value.targetActivityId) || !baseline.activities.some((activity) => activity.id === value.targetActivityId)) errors.push(error('INVALID_REFERENCE', `${path}/targetActivityId`, 'Incident target does not exist.', String(value.id), [String(value.targetActivityId)]))
  if (!isSafeInteger(value.startDelayMinutes)) errors.push(error('INVALID_NUMBER', `${path}/startDelayMinutes`, 'Delay must be a safe integer.'))
  else if (value.startDelayMinutes < 0) errors.push(error('OUT_OF_RANGE', `${path}/startDelayMinutes`, 'Delay cannot be negative.'))
  if (!isIsoInstant(value.createdAt)) errors.push(error('INVALID_DATE', `${path}/createdAt`, 'Created time must be a valid UTC instant.'))
  return errors.length ? failure(...errors) : success(value as unknown as Incident)
}

export const validateRecoveryOption = (value: unknown, baseline: BaselineSnapshot, incident: Incident, currency: CurrencyCode, limits: EngineLimits, path = '/recovery'): Result<RecoveryOption> => {
  if (!isRecord(value)) return failure(error('INVALID_SHAPE', path, 'Recovery option must be an object.'))
  const errors: ReturnType<typeof error>[] = []
  for (const key of ['id','incidentId','name','description','costMinorUnits','currency','modifications','approvalStatus','assumptionNotes','status']) if (!has(value, key)) errors.push(error('INVALID_SHAPE', `${path}/${key}`, 'Required field is missing.'))
  if (!idIsValid(value.id)) errors.push(error('INVALID_TEXT', `${path}/id`, 'ID is invalid.'))
  if (value.incidentId !== incident.id) errors.push(error('INCIDENT_MISMATCH', `${path}/incidentId`, 'Option references another incident.', String(value.id)))
  if (!isString(value.name) || value.name.trim() === '') errors.push(error('INVALID_TEXT', `${path}/name`, 'Name must not be blank.'))
  if (!isNullableString(value.description)) errors.push(error('INVALID_SHAPE', `${path}/description`, 'Description must be text or null.'))
  if (value.costMinorUnits !== null && (!isSafeInteger(value.costMinorUnits) || value.costMinorUnits < 0)) errors.push(error('OUT_OF_RANGE', `${path}/costMinorUnits`, 'Cost must be null or a non-negative safe integer.', String(value.id)))
  if (value.currency !== currency) errors.push(error('CURRENCY_MISMATCH', `${path}/currency`, 'Option currency must match the request currency.', String(value.id)))
  const costRequirements = Array.isArray(value.approvalRequirements) ? value.approvalRequirements : []
  if (!Array.isArray(value.modifications) || value.modifications.length > limits.maxModifications) errors.push(error('LIMIT_EXCEEDED', `${path}/modifications`, 'Modification limit exceeded.', String(value.id)))
  const seen = new Set<string>()
  if (Array.isArray(value.modifications)) value.modifications.forEach((mod, index) => {
    if (!isRecord(mod)) { errors.push(error('INVALID_SHAPE', `${path}/modifications/${index}`, 'Modification must be an object.')); return }
    const key = `${String(mod.activityId)}\u0000${String(mod.field)}`
    if (seen.has(key)) errors.push(error('DUPLICATE_MODIFICATION', `${path}/modifications/${index}`, 'Each activity and field may be modified once.', String(value.id)))
    seen.add(key)
    if (!baseline.activities.some((activity) => activity.id === mod.activityId)) errors.push(error('INVALID_REFERENCE', `${path}/modifications/${index}/activityId`, 'Modification target does not exist.', String(value.id), [String(mod.activityId)]))
    if (!['earliest_start','duration'].includes(String(mod.field)) || !['set','add'].includes(String(mod.operation))) errors.push(error('INVALID_SHAPE', `${path}/modifications/${index}`, 'Modification field or operation is invalid.', String(value.id)))
    if (!isSafeInteger(mod.valueMinutes)) errors.push(error('INVALID_NUMBER', `${path}/modifications/${index}/valueMinutes`, 'Modification value must be a safe integer.', String(value.id)))
  })
  if (!['not_required','pending','confirmed'].includes(String(value.approvalStatus))) errors.push(error('INVALID_SHAPE', `${path}/approvalStatus`, 'Approval status is invalid.', String(value.id)))
  if (!Array.isArray(value.assumptionNotes) || value.assumptionNotes.some((note) => !isString(note))) errors.push(error('INVALID_SHAPE', `${path}/assumptionNotes`, 'Assumption notes must be strings.', String(value.id)))
  if (!['draft','selected'].includes(String(value.status))) errors.push(error('INVALID_SHAPE', `${path}/status`, 'Option status is invalid.', String(value.id)))
  if (value.approvalStatus === 'not_required' && (value.modifications as unknown[] | undefined)?.length && (value.approvalRequirements as unknown[] | undefined)?.length) errors.push(error('APPROVAL_REQUIRED', `${path}/approvalStatus`, 'Approval-required options cannot be not_required.', String(value.id)))
  if (errors.length) return failure(...errors)
  return success({ ...value, approvalRequirements: costRequirements, approvalContext: isNullableString(value.approvalContext) ? value.approvalContext : null } as unknown as RecoveryOption)
}

export const validateLimits = (limits: EngineLimits): Result<EngineLimits> => {
  const errors: ReturnType<typeof error>[] = []
  for (const [key, value] of Object.entries(limits)) if (!isSafeInteger(value) || value < 0) errors.push(error('INVALID_NUMBER', `/limits/${key}`, 'Limit must be a non-negative safe integer.'))
  return errors.length ? failure(...errors) : success(limits)
}
