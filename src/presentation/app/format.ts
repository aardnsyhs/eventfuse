import { currencyExponent } from "@/domain/currency";
import type { CurrencyCode } from "@/domain/types";

export function formatMoney(
  minorUnits: number | null,
  currency: CurrencyCode,
): string {
  if (minorUnits === null) return "Not entered";
  const exponent = currencyExponent(currency);
  if (exponent === null) return `${currency}: currency metadata unavailable`;
  const exact = costInput(minorUnits, currency);
  const [whole, fraction] = exact.split(".");
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  })
    .formatToParts(BigInt(whole))
    .map((part) => (part.type === "fraction" ? fraction : part.value))
    .join("");
}

export function costInput(amount: number, currency: string) {
  const digits = currencyExponent(currency) ?? 0,
    raw = String(amount).padStart(digits + 1, "0");
  return digits ? `${raw.slice(0, -digits)}.${raw.slice(-digits)}` : raw;
}

export const moneyLabel = (
  minorUnits: number | null,
  currency: CurrencyCode,
) =>
  minorUnits === null
    ? `Not entered · unknown is not ${currency} 0`
    : formatMoney(minorUnits, currency);

export function formatMinutes(minutes: number): string {
  if (minutes === 0) return "0 min";
  const sign = minutes < 0 ? "−" : "";
  const total = Math.abs(minutes);
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${sign}${rest} min`;
  if (rest === 0) return `${sign}${hours} h`;
  return `${sign}${hours} h ${rest} min`;
}

export function formatCount(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export const ordinalId = (index: number): string =>
  String.fromCharCode(65 + Math.min(index, 25));

export function formatDateLabel(event: {
  readonly date: string;
  readonly timezone: string;
}): string {
  const [year, month, day] = event.date.split("-");
  const name =
    [
      "JAN",
      "FEB",
      "MAR",
      "APR",
      "MAY",
      "JUN",
      "JUL",
      "AUG",
      "SEP",
      "OCT",
      "NOV",
      "DEC",
    ][Number(month) - 1] ?? "";
  return `${day} ${name} ${year} · ${event.timezone} · ALL TIMES LOCAL`;
}
