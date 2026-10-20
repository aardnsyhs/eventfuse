import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createDemoDocument, demoCatalog } from "@/demo/seed";
import {
  corporateLaunchBaseline,
  demoOptionA,
  demoOptionB,
  powerDelayIncident,
} from "@/demo/fixtures";
import { persistable, validateDocument } from "@/application/validation";
import { selectWorkspace } from "@/application/selectors";
import { emptyState, restoreState } from "@/application/commands";
import { DEFAULT_LIMITS } from "@/engine";

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

describe("demo seed stays identical to the frozen fictional inputs", () => {
  it("reproduces the canonical baseline, incident and both options verbatim", () => {
    const baseline = example("corporate-launch-baseline").request;
    expect({
      baselineVersion: corporateLaunchBaseline.baselineVersion,
      event: corporateLaunchBaseline.event,
      activities: corporateLaunchBaseline.activities,
      dependencies: corporateLaunchBaseline.dependencies,
      milestones: corporateLaunchBaseline.milestones,
    }).toEqual(baseline.baseline);
    expect(DEFAULT_LIMITS).toEqual(baseline.limits);

    const incident = example("vendor-delay-deadline-breach").request.incident;
    expect({
      eventId: powerDelayIncident.eventId,
      baselineVersion: powerDelayIncident.baselineVersion,
      title: powerDelayIncident.title,
      description: powerDelayIncident.description,
      targetActivityId: powerDelayIncident.targetActivityId,
      startDelayMinutes: powerDelayIncident.startDelayMinutes,
      createdAt: powerDelayIncident.createdAt,
    }).toEqual({
      eventId: incident.eventId,
      baselineVersion: incident.baselineVersion,
      title: incident.title,
      description: incident.description,
      targetActivityId: incident.targetActivityId,
      startDelayMinutes: incident.startDelayMinutes,
      createdAt: incident.createdAt,
    });

    for (const [fixtureId, option] of [
      ["figma-option-a-unknown-cost", demoOptionA],
      ["figma-option-b-unknown-cost", demoOptionB],
    ] as const) {
      const source = example(fixtureId).request.recovery;
      expect({
        id: option.id,
        name: option.name,
        description: option.description,
        costMinorUnits: option.costMinorUnits,
        currency: option.currency,
        modifications: option.modifications,
        approvalStatus: option.approvalStatus,
        approvalRequirements: option.approvalRequirements,
        approvalContext: option.approvalContext,
        assumptionNotes: option.assumptionNotes,
      }).toEqual({
        id: source.id,
        name: source.name,
        description: source.description,
        costMinorUnits: source.costMinorUnits,
        currency: source.currency,
        modifications: source.modifications,
        approvalStatus: source.approvalStatus,
        approvalRequirements: source.approvalRequirements,
        approvalContext: source.approvalContext,
        assumptionNotes: source.assumptionNotes,
      });
    }
  });

  it("is a valid document with both options applied, no selection and no cost", () => {
    const document = createDemoDocument();
    const valid = validateDocument(document);
    expect(valid.ok).toBe(true);
    expect(document.selectedOptionByIncident).toEqual({});
    expect(
      Object.values(document.recoveryOptions).map((o) => o.costMinorUnits),
    ).toEqual([null, null]);
    expect(
      Object.values(document.recoveryOptions).map((o) => o.approvalStatus),
    ).toEqual(["pending", "pending"]);
    expect(Object.keys(document.editing.recoveries)).toEqual([]);
  });

  it("derives the canonical demo metrics from the engine, not literals", () => {
    const workspace = selectWorkspace(restoreState(createDemoDocument()));
    const baselineDoors =
      workspace.baselineResult!.milestoneImpacts[0].finishMinute;
    const incidentDoors = workspace.impact!.milestoneImpacts[0].finishMinute;
    expect(baselineDoors).toBe(540); // 17:00
    expect(incidentDoors).toBe(660); // 19:00
    expect(workspace.impact!.milestoneImpacts[0].breachMinutes).toBe(120);

    const byId = Object.fromEntries(
      workspace.optionResults.map((a) => [
        a.recoveryOptionId,
        a.result.ok ? a.result.value : null,
      ]),
    );
    const a = byId[demoCatalog.options[0].id]!;
    const b = byId[demoCatalog.options[1].id]!;
    expect(a.milestoneImpacts[0].finishMinute).toBe(540);
    expect(a.milestoneImpacts[0].recoveredMinutes).toBe(120);
    expect(b.milestoneImpacts[0].finishMinute).toBe(600);
    expect(b.milestoneImpacts[0].recoveredMinutes).toBe(60);
    expect(b.milestoneImpacts[0].breachMinutes).toBe(60);
    expect(a.recoveryCostMinorUnits).toBeNull();
    expect(b.recoveryCostMinorUnits).toBeNull();
    expect(a.approvalStatus).toBe("pending");
    expect(b.approvalStatus).toBe("pending");
  });

  it("never fabricates a preference for a fresh workspace", () => {
    const workspace = selectWorkspace(emptyState());
    expect(workspace.selected).toBeNull();
  });

  it("round-trips through the persistence validator unchanged", () => {
    const document = createDemoDocument();
    const persist = persistable(restoreState(document));
    expect(persist.ok).toBe(true);
    if (persist.ok)
      expect(persist.value.editing.baseline).toEqual(
        document.editing.baseline,
      );
  });
});
