import { describe, expect, it } from "vitest";
import {
  calendarDate,
  calendarValue,
  calendarDateLib,
} from "@/presentation/app/calendar-date";
import { DateLib } from "react-day-picker";

describe("calendar date adapter", () => {
  it("keeps the calendar grid consecutive across a browser's skipped civil date", () => {
    const library = new DateLib({}, calendarDateLib);
    const start = calendarDate("2011-12-28")!;
    expect(
      Array.from({ length: 5 }, (_, i) =>
        calendarValue(library.addDays(start, i)),
      ),
    ).toEqual([
      "2011-12-28",
      "2011-12-29",
      "2011-12-30",
      "2011-12-31",
      "2012-01-01",
    ]);
  });
  it("preserves literal dates through month and year navigation", () => {
    const library = new DateLib({}, calendarDateLib);
    expect(
      calendarValue(library.addMonths(calendarDate("2026-10-15")!, 1)),
    ).toBe("2026-11-15");
    expect(
      calendarValue(library.addYears(calendarDate("2026-10-15")!, 1)),
    ).toBe("2027-10-15");
  });
  it("constructs early years without JavaScript's 1900 offset", () => {
    expect(calendarValue(calendarDateLib.newDate(1, 0, 1))).toBe("0001-01-01");
  });
  it.each([
    "2026-10-15",
    "2024-02-29",
    "2011-12-30",
    "0001-01-01",
    "0099-12-31",
    "9999-12-31",
  ])("round trips %s without using the event or browser timezone", (value) => {
    const date = calendarDate(value)!;
    expect(calendarValue(date)).toBe(value);
    expect(Math.abs(date.getTimezoneOffset())).toBe(0);
    expect(date.getHours()).toBe(12);
  });
  it.each([
    "",
    "2026-02-29",
    "2026-04-31",
    "2026-13-01",
    "2026-00-01",
    "2026-01-00",
    "0000-01-01",
    "2026-10-15T00:00Z",
    "2026-1-2",
  ])("rejects invalid date %s rather than normalizing it", (value) => {
    expect(calendarDate(value)).toBeUndefined();
  });
});
