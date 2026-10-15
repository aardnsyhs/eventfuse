import type { Id } from '../domain/types'

export type ErrorCode = 'INVALID_SHAPE' | 'INVALID_TEXT' | 'INVALID_DATE' | 'INVALID_TIMEZONE' | 'UNSUPPORTED_SCHEMA' | 'INVALID_NUMBER' | 'OUT_OF_RANGE' | 'OVERFLOW' | 'LIMIT_EXCEEDED' | 'DUPLICATE_ID' | 'INVALID_REFERENCE' | 'EVENT_MISMATCH' | 'STALE_BASELINE' | 'SELF_DEPENDENCY' | 'DUPLICATE_DEPENDENCY' | 'CYCLE' | 'MILESTONE_DURATION' | 'DUPLICATE_MODIFICATION' | 'PROTECTED_DURATION' | 'APPROVAL_REQUIRED' | 'CURRENCY_MISMATCH' | 'UNKNOWN_CURRENCY' | 'INCIDENT_MISMATCH' | 'TOO_MANY_ALTERNATIVES' | 'SELECTION_MISMATCH'

export interface ValidationError {
  readonly code: ErrorCode
  readonly path: string
  readonly entityId: Id | null
  readonly message: string
  readonly relatedIds: readonly Id[]
}

export type Result<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly errors: readonly ValidationError[] }

export const success = <T>(value: T): Result<T> => ({ ok: true, value })
export const failure = <T = never>(...errors: ValidationError[]): Result<T> => ({ ok: false, errors: sortErrors(errors) })

export const error = (code: ErrorCode, path: string, message: string, entityId: Id | null = null, relatedIds: readonly Id[] = []): ValidationError => ({ code, path, message, entityId, relatedIds })

export function sortErrors(errors: readonly ValidationError[]): ValidationError[] {
  return [...errors].sort((a, b) => { const left = `${a.path}\u0000${a.code}\u0000${a.entityId ?? ''}`; const right = `${b.path}\u0000${b.code}\u0000${b.entityId ?? ''}`; return left < right ? -1 : left > right ? 1 : 0 })
}
