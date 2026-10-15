import { expect } from "vitest";
import raw from "../../../docs/engineering-preparation/GOLDEN_TEST_FIXTURES.json";
import type { EngineRequest } from "../../engine/index";
import { createApplicationController } from "../controller";
import type { ControllerOptions } from "../controller";
import type { Command, Namespace } from "../types";
export const source = (id: string): EngineRequest =>
  structuredClone(raw.cases.find((c) => c.id === id)!.request) as EngineRequest;
export function setup(
  options: ControllerOptions = {},
  namespace: Namespace = "workspace",
  eventId = "launch",
) {
  const controller = createApplicationController(options);
  const run = (command: Command) => {
    const result = controller.dispatch(command);
    expect(result.ok, JSON.stringify(result.ok ? null : result.errors)).toBe(
      true,
    );
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    return result;
  };
  const b = source("corporate-launch-baseline").baseline;
  run({
    type: "event.create",
    event: { ...b.event, id: eventId },
    currency: "USD",
    namespace,
  });
  for (const activity of b.activities)
    run({ type: "activity.put", activity: { ...activity, eventId } });
  for (const dependency of b.dependencies)
    run({ type: "dependency.put", dependency: { ...dependency, eventId } });
  for (const milestone of b.milestones)
    run({ type: "milestone.put", milestone: { ...milestone, eventId } });
  run({ type: "baseline.apply", expectedVersion: null });
  const applyIncident = (delay = 240) => {
    const version = controller.getSnapshot().document!.currentBaselineVersion!;
    run({
      type: "incident.configure",
      draft: {
        baselineVersion: version,
        targetActivityId: "power",
        startDelayMinutes: delay,
        title: "Hypothetical power delay",
        description: null,
      },
    });
    run({
      type: "incident.apply",
      expectedVersion: version,
      createdAt: b.event.createdAt,
    });
    return controller.getSnapshot().document!.activeIncidentId!;
  };
  const addOption = (fixtureId: string) => {
    const request = source(fixtureId);
    if (request.kind !== "recovery")
      throw new Error("Expected recovery fixture");
    const option = request.recovery,
      incidentId = controller.getSnapshot().document!.activeIncidentId!;
    const before = new Set(
      Object.keys(controller.getSnapshot().editing!.recoveries),
    );
    run({
      type: "recovery.add",
      expectedIncidentId: incidentId,
      option: {
        name: option.name,
        description: option.description,
        costMinorUnits: option.costMinorUnits,
        currency: option.currency,
        modifications: option.modifications,
        approvalStatus: option.approvalStatus,
        approvalRequirements: option.approvalRequirements,
        approvalContext: option.approvalContext,
        assumptionNotes: option.assumptionNotes,
      },
    });
    const id = Object.keys(controller.getSnapshot().editing!.recoveries).find(
      (id) => !before.has(id),
    )!;
    run({ type: "recovery.apply", expectedIncidentId: incidentId, id });
    return id;
  };
  const canonical = () => {
    const incidentId = applyIncident(),
      a = addOption("figma-option-a-unknown-cost"),
      b = addOption("figma-option-b-unknown-cost");
    run({ type: "recovery.compare", expectedIncidentId: incidentId });
    return { incidentId, a, b };
  };
  return { controller, run, applyIncident, addOption, canonical };
}
export const metadata = (id = "brief-1") => ({
  id,
  authorLabel: null,
  createdAt: "2026-10-15T00:20:00Z",
  nextActions: ["Obtain external confirmation."],
  assumptionsAndConstraints: ["Hypothetical, not authorized work."],
});
