import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  activities,
  eventSample,
  graphConnections,
  recoverySamples,
} from "@/presentation/sample";

const fixtures = JSON.parse(
  readFileSync(
    new URL(
      "../../../docs/engineering-preparation/GOLDEN_TEST_FIXTURES.json",
      import.meta.url,
    ),
    "utf8",
  ),
);
const example = (id: string) =>
  fixtures.cases.find((item: { id: string }) => item.id === id);
const clock = (minute: number) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: eventSample.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(
    new Date(Date.parse(eventSample.referenceInstant) + minute * 60_000),
  );

describe("presentation sample matches frozen authoritative expectations", () => {
  it("uses canonical identity, reference, timezone and currency", () => {
    const request = example("corporate-launch-baseline").request;
    expect(eventSample.date).toBe(request.baseline.event.date);
    expect(eventSample.timezone).toBe(request.baseline.event.timezone);
    expect(eventSample.referenceInstant).toBe(
      request.baseline.event.referenceInstant,
    );
    expect(eventSample.currency).toBe(request.currency);
  });
  it.each([
    ["baseline", "corporate-launch-baseline"],
    ["a", "figma-option-a-unknown-cost"],
    ["b", "figma-option-b-unknown-cost"],
  ] as const)(
    "%s activity times match every frozen timing row",
    (column, fixtureId) => {
      const timings = example(fixtureId).expected.projection.activityTimings;
      for (const activity of activities) {
        const [start, finish] = timings[activity.id];
        expect(activity[column]).toBe(
          start === finish ? clock(start) : `${clock(start)}–${clock(finish)}`,
        );
      }
    },
  );
  it.each(["a", "b"] as const)(
    "option %s retains null cost, pending approval and exact milestone/count metrics",
    (id) => {
      const expected = example(`figma-option-${id}-unknown-cost`).expected
        .projection;
      const option = recoverySamples[id];
      expect(option.costMinorUnits).toBeNull();
      expect(option.approvalStatus).toBe(expected.approvalStatus);
      expect(option.recovered).toBe(
        expected.milestoneImpacts[0].recoveredMinutes,
      );
      expect(option.breach).toBe(expected.milestoneImpacts[0].breachMinutes);
      expect(option.shifted).toBe(expected.shiftedActivityIds.length);
      expect(option.downstreamShifted).toBe(
        expected.downstreamAffectedActivityIds.length,
      );
    },
  );
  it("preserves the six baseline relationships and protected testing duration", () => {
    const baseline = example("corporate-launch-baseline").request.baseline;
    expect(
      graphConnections.map(([, from, to]) => `${from}->${to}`).sort(),
    ).toEqual(
      baseline.dependencies
        .map(
          (d: { predecessorId: string; successorId: string }) =>
            `${d.predecessorId}->${d.successorId}`,
        )
        .sort(),
    );
    expect(activities.find((a) => a.id === "testing")).toMatchObject({
      classification: "protected",
      duration: 60,
    });
  });
});
