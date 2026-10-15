import type { AppError, AppErrorCode, AppResult } from "./types";
import type { ValidationError } from "../engine/index";
export const appError = (
  code: AppErrorCode,
  message: string,
  path = "",
): AppError => ({ code, message, path });
export const fail = <T = never>(...errors: AppError[]): AppResult<T> => ({
  ok: false,
  errors,
});
export const success = <T>(value: T): AppResult<T> => ({ ok: true, value });
export const engineErrors = (errors: readonly ValidationError[]): AppError[] =>
  errors.map((e) => ({
    code: "VALIDATION",
    path: e.path,
    message: e.message,
    validationErrors: [e],
  }));
export const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null &&
  typeof value === "object" &&
  (Object.getPrototypeOf(value) === Object.prototype ||
    Object.getPrototypeOf(value) === null);
export const safeId = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length > 0 &&
  !["__proto__", "prototype", "constructor"].includes(value);
export const own = (value: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);
export function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (isRecord(value))
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`)
      .join(",")}}`;
  return JSON.stringify(value) ?? "undefined";
}
export const same = (a: unknown, b: unknown): boolean =>
  canonical(a) === canonical(b);
