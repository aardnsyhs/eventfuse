import type { BaselineSnapshot, BriefMetadata, CurrencyCode, EngineLimits, Incident, RecoveryOption } from './types'
import type { DecisionBrief, ScenarioResult } from './types'
import type { Result } from '../engine/errors'

export interface CommonRequest { readonly baseline: BaselineSnapshot; readonly currency: CurrencyCode; readonly limits: EngineLimits; readonly scenarioId: string }
export type EngineRequest = CommonRequest | (CommonRequest & { readonly kind: 'baseline' }) | (CommonRequest & { readonly kind: 'incident'; readonly incident: Incident }) | (CommonRequest & { readonly kind: 'recovery'; readonly incident: Incident; readonly recovery: RecoveryOption })
export interface ComparisonRequest { readonly baseline: BaselineSnapshot; readonly currency: CurrencyCode; readonly limits: EngineLimits; readonly incident: Incident; readonly scenarioIds: { readonly baseline: string; readonly incident: string; readonly recoveries: Readonly<Record<string, string>> }; readonly alternatives: readonly RecoveryOption[] }
export interface RecoveryComparison { readonly baseline: ScenarioResult; readonly unmitigated: ScenarioResult; readonly alternatives: readonly { readonly recoveryOptionId: string; readonly result: Result<ScenarioResult> }[] }
export { type BriefMetadata }
export type PublicResult<T> = Result<T>
export type { BaselineSnapshot, Incident, RecoveryOption, ScenarioResult, DecisionBrief, CurrencyCode, EngineLimits }
