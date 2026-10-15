import type { ComparisonRequest, EngineRequest } from '../domain/engine-api'
import type { BriefMetadata, RecoveryCostDraft } from '../domain/types'
import { DEFAULT_LIMITS } from '../domain/types'
import { parseRecoveryCost, validateBaseline, validateIncident, validateLimits, validateCurrency, validateRecoveryOption } from '../domain/validation'
import { buildDecisionBrief as buildBrief } from './brief'
import { compareRecoveries as compare } from './compare'
import { calculateScenario } from './scenarios'
import type { Result } from './errors'
import type { DecisionBrief, ScenarioResult } from '../domain/types'
export type { Result } from './errors'
export type { ErrorCode, ValidationError } from './errors'
export type * from '../domain/types'
export type * from '../domain/engine-api'

export const validateRequest = (input: unknown): Result<EngineRequest> => {
  if (!input || typeof input !== 'object') return { ok: false, errors: [{ code: 'INVALID_SHAPE', path: '/', entityId: null, message: 'Request must be an object.', relatedIds: [] }] }
  const request = input as Record<string, unknown>
  const limits = request.limits && typeof request.limits === 'object' ? request.limits as typeof DEFAULT_LIMITS : DEFAULT_LIMITS
  const limitResult = validateLimits(limits); if (!limitResult.ok) return limitResult
  const baselineResult = validateBaseline(request.baseline, 'runnable', limits); if (!baselineResult.ok) return baselineResult
  const currencyResult = validateCurrency(String(request.currency)); if (!currencyResult.ok) return currencyResult
  if (request.kind === 'baseline') return { ok: true, value: request as unknown as EngineRequest }
  const incidentResult = validateIncident(request.incident, baselineResult.value); if (!incidentResult.ok) return incidentResult
  if (request.kind === 'incident') return { ok: true, value: request as unknown as EngineRequest }
  if (request.kind === 'recovery') {
    const recoveryResult = validateRecoveryOption(request.recovery, baselineResult.value, incidentResult.value, String(request.currency), limits); if (!recoveryResult.ok) return recoveryResult
    return { ok: true, value: request as unknown as EngineRequest }
  }
  return { ok: false, errors: [{ code: 'INVALID_SHAPE', path: '/kind', entityId: null, message: 'Unknown request kind.', relatedIds: [] }] }
}

export const calculate = (request: EngineRequest): Result<ScenarioResult> => {
  const valid = validateRequest(request); if (!valid.ok) return valid
  const result = calculateScenario(request as never)
  if (!result.ok) return result
  return { ok: true, value: result.value.recovery ?? result.value.incident ?? result.value.baseline }
}

export const compareRecoveries = (request: ComparisonRequest) => compare(request)
export const buildDecisionBrief = (request: ComparisonRequest, selectedRecoveryOptionId: string, metadata: BriefMetadata): Result<DecisionBrief> => buildBrief(request, selectedRecoveryOptionId, metadata)
export { parseRecoveryCost }
export { DEFAULT_LIMITS }
export type { RecoveryCostDraft }
