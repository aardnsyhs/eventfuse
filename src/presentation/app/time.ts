const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(timeZone: string) {
  let found = formatters.get(timeZone);
  if (!found) {
    found = new Intl.DateTimeFormat("sv-SE", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(timeZone, found);
  }
  return found;
}
function localParts(timeZone: string, instant: number) {
  const parts = formatter(timeZone).formatToParts(instant);
  const read = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${read("year")}-${read("month")}-${read("day")}T${read("hour")}:${read("minute")}:${read("second")}`;
}
export function isKnownTimeZone(zone: string) {
  try {
    formatter(zone).format(0);
    return true;
  } catch {
    return false;
  }
}
export type LocalTimeResolution = { ok: true; minute: number; iso: string };
export type LocalTimeFailure = {
  ok: false;
  code: "INVALID_TIME" | "AMBIGUOUS_TIME" | "NONEXISTENT_TIME";
  message: string;
  candidates?: readonly string[];
};
export function resolveLocalTime(
  event: { date: string; timezone: string; referenceInstant: string },
  clock: string,
  chosenIso?: string,
): LocalTimeResolution | LocalTimeFailure {
  const wall = clock.includes("T") ? clock : `${event.date}T${clock}`;
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(wall) ||
    !isKnownTimeZone(event.timezone)
  )
    return {
      ok: false,
      code: "INVALID_TIME",
      message: "Enter a valid local date, whole minute and IANA timezone.",
    };
  const naive = Date.parse(`${wall}:00Z`);
  if (
    !Number.isFinite(naive) ||
    new Date(naive).toISOString().slice(0, 16) !== wall
  )
    return {
      ok: false,
      code: "INVALID_TIME",
      message: "The local calendar date or time is invalid.",
    };
  const offsets = new Set<number>();
  for (let step = -72; step <= 72; step++) {
    const probe = naive + step * 30 * 60_000;
    offsets.add(Date.parse(`${localParts(event.timezone, probe)}Z`) - probe);
  }
  const candidates = [...offsets]
    .map((offset) => naive - offset)
    .filter(
      (instant) =>
        localParts(event.timezone, instant) === `${wall}:00` &&
        instant % 60_000 === 0,
    )
    .sort((a, b) => a - b)
    .map((instant) => new Date(instant).toISOString().replace(".000Z", "Z"));
  if (!candidates.length)
    return {
      ok: false,
      code: "NONEXISTENT_TIME",
      message: `${wall} does not exist in ${event.timezone}. Choose a time outside the clock change.`,
    };
  if (candidates.length > 1 && !candidates.includes(chosenIso ?? ""))
    return {
      ok: false,
      code: "AMBIGUOUS_TIME",
      message: `${wall} occurs more than once in ${event.timezone}. Choose its UTC instant explicitly.`,
      candidates,
    };
  const iso =
    chosenIso && candidates.includes(chosenIso) ? chosenIso : candidates[0];
  const reference = Date.parse(event.referenceInstant);
  if (!Number.isFinite(reference) || reference % 60_000 !== 0)
    return {
      ok: false,
      code: "INVALID_TIME",
      message: "The reference instant must be a valid whole UTC minute.",
    };
  return { ok: true, iso, minute: (Date.parse(iso) - reference) / 60_000 };
}
export function localInput(zone: string, reference: string, minute = 0) {
  return localParts(zone, Date.parse(reference) + minute * 60_000).slice(0, 16);
}
export function formatLocalTime(
  zone: string,
  reference: string,
  minute: number,
) {
  return localInput(zone, reference, minute).slice(11);
}
export function eventTime(
  event: { timezone: string; referenceInstant: string; date: string },
  minute: number,
) {
  const value = localInput(event.timezone, event.referenceInstant, minute);
  return value.slice(0, 10) === event.date
    ? value.slice(11)
    : value.replace("T", " ");
}
