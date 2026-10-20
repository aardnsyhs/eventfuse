import { UTCDate } from "@date-fns/utc";

function dateFromParts(year: number, month: number, day: number) {
  const date = new UTCDate(0);
  date.setUTCFullYear(year, month, day);
  date.setUTCHours(12, 0, 0, 0);
  return date;
}

export const calendarDateLib = {
  newDate: dateFromParts,
  today: () => {
    const now = new Date();
    return dateFromParts(now.getFullYear(), now.getMonth(), now.getDate());
  },
};

// UTC is a calendar adapter here, never an event reference instant.
export function calendarDate(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1) return undefined;
  const date = dateFromParts(year, month - 1, day);
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : undefined;
}
export function calendarValue(date: Date) {
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
