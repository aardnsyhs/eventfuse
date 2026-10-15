import type { CurrencyCode } from './types'

export const CURRENCY_EXPONENTS: Readonly<Record<string, number>> = Object.freeze({ USD: 2, GBP: 2, EUR: 2, IDR: 2, JPY: 0 })

export const currencyExponent = (currency: CurrencyCode): number | null => Object.prototype.hasOwnProperty.call(CURRENCY_EXPONENTS, currency) ? CURRENCY_EXPONENTS[currency] : null
