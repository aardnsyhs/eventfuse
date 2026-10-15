import type { ComparisonRequest, RecoveryComparison } from '../domain/engine-api'
import { validateBaseline, validateCurrency, validateIncident, validateLimits, validateRecoveryOption } from '../domain/validation'
import { calculateScenario } from './scenarios'
import { error, failure, success, type Result } from './errors'

const ordinal = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0

export const compareRecoveries = (request: ComparisonRequest): Result<RecoveryComparison> => {
  const baseline = validateBaseline(request.baseline, 'runnable', request.limits); if (!baseline.ok) return baseline
  const currency = validateCurrency(request.currency); if (!currency.ok) return currency
  const limits = validateLimits(request.limits); if (!limits.ok) return limits
  const incident = validateIncident(request.incident, baseline.value); if (!incident.ok) return incident
  if (request.alternatives.length === 0) return failure(error('OUT_OF_RANGE', '/alternatives', 'At least one alternative is required.'))
  if (request.alternatives.length > 3) return failure(error('TOO_MANY_ALTERNATIVES', '/alternatives', 'No more than three alternatives are supported.'))
  const baselineRequest = { kind: 'baseline' as const, baseline: baseline.value, currency: request.currency, limits: request.limits, scenarioId: request.scenarioIds.baseline }
  const baselineResult = calculateScenario(baselineRequest); if (!baselineResult.ok) return baselineResult
  const incidentRequest = { kind: 'incident' as const, baseline: baseline.value, currency: request.currency, limits: request.limits, scenarioId: request.scenarioIds.incident, incident: incident.value }
  const incidentResult = calculateScenario(incidentRequest); if (!incidentResult.ok) return incidentResult
  const alternatives = request.alternatives.map((option) => {
    const optionValidation = validateRecoveryOption(option, baseline.value, incident.value, request.currency, request.limits, `/alternatives/${request.alternatives.indexOf(option)}`)
    if (!optionValidation.ok) return { recoveryOptionId: option.id, result: optionValidation }
    const scenarioId = request.scenarioIds.recoveries[option.id]
    if (!scenarioId) return { recoveryOptionId: option.id, result: failure(error('INVALID_REFERENCE', `/scenarioIds/recoveries/${option.id}`, 'Scenario ID is required.', option.id)) }
    const calculated = calculateScenario({ kind: 'recovery', baseline: baseline.value, currency: request.currency, limits: request.limits, scenarioId, incident: incident.value, recovery: optionValidation.value })
    return { recoveryOptionId: option.id, result: calculated.ok ? success(calculated.value.recovery as NonNullable<typeof calculated.value.recovery>) : calculated }
  }).sort((a, b) => ordinal(a.recoveryOptionId, b.recoveryOptionId))
  return success({ baseline: baselineResult.value.baseline, unmitigated: incidentResult.value.incident as NonNullable<typeof incidentResult.value.incident>, alternatives })
}
