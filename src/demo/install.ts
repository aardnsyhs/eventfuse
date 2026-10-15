import type {
  AppResult,
  Command,
  WorkspaceDocument,
} from "@/application/types";
import type { WorkspaceController } from "@/presentation/app/workspace";
import { createDemoDocument } from "@/demo/seed";
import {
  corporateLaunchBaseline,
  demoOptionA,
  demoOptionB,
  powerDelayIncident,
} from "@/demo/fixtures";

export const DEMO_NAMESPACE = "demo" as const;
export const DEMO_EVENT_ID = corporateLaunchBaseline.event.id;

export type DemoOrigin = "restored" | "seeded" | "session-only";

export interface DemoOpenResult {
  readonly ok: boolean;
  readonly origin: DemoOrigin;
  readonly message: string;
}

function buildInSession(controller: WorkspaceController): AppResult<unknown> {
  const dispatch = (command: Command) => {
    const result = controller.dispatch(command);
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    return result;
  };
  const event = corporateLaunchBaseline.event;
  dispatch({
    type: "event.create",
    event,
    currency: "USD",
    namespace: DEMO_NAMESPACE,
  });
  for (const activity of corporateLaunchBaseline.activities)
    dispatch({ type: "activity.put", activity });
  for (const dependency of corporateLaunchBaseline.dependencies)
    dispatch({ type: "dependency.put", dependency });
  for (const milestone of corporateLaunchBaseline.milestones)
    dispatch({ type: "milestone.put", milestone });
  dispatch({ type: "baseline.apply", expectedVersion: null });
  const version = controller.getSnapshot().document!.currentBaselineVersion!;
  dispatch({
    type: "incident.configure",
    draft: {
      baselineVersion: version,
      targetActivityId: powerDelayIncident.targetActivityId,
      startDelayMinutes: powerDelayIncident.startDelayMinutes,
      title: powerDelayIncident.title,
      description: powerDelayIncident.description,
    },
  });
  dispatch({
    type: "incident.apply",
    expectedVersion: version,
    createdAt: powerDelayIncident.createdAt,
  });
  const incidentId = controller.getSnapshot().document!.activeIncidentId!;
  for (const source of [demoOptionA, demoOptionB]) {
    const before = new Set(
      Object.keys(controller.getSnapshot().editing!.recoveries),
    );
    dispatch({
      type: "recovery.add",
      expectedIncidentId: incidentId,
      option: {
        name: source.name,
        description: source.description,
        costMinorUnits: source.costMinorUnits,
        currency: source.currency,
        modifications: source.modifications,
        approvalStatus: source.approvalStatus,
        approvalRequirements: source.approvalRequirements,
        approvalContext: source.approvalContext,
        assumptionNotes: source.assumptionNotes,
      },
    });
    const id = Object.keys(controller.getSnapshot().editing!.recoveries).find(
      (candidate) => !before.has(candidate),
    )!;
    dispatch({ type: "recovery.apply", expectedIncidentId: incidentId, id });
  }
  dispatch({ type: "recovery.compare", expectedIncidentId: incidentId });
  return { ok: true, value: undefined };
}

export async function openDemo(
  controller: WorkspaceController,
  writeToken: () => string,
  persistence: {
    load: (
      namespace: "demo",
      eventId: string,
    ) => Promise<AppResult<WorkspaceDocument | null>>;
    save: (
      document: WorkspaceDocument,
      expected: string | null,
      write: string,
    ) => Promise<AppResult<WorkspaceDocument>>;
  },
): Promise<DemoOpenResult> {
  const existing = controller.getSnapshot().document;
  if (existing && controller.getSnapshot().persistence.status !== "saved")
    return {
      ok: false,
      origin: "session-only",
      message: "Finish or discard the current unsaved session first.",
    };
  if (existing) return { ok: true, origin: "restored", message: "Demo ready." };

  const loaded = await controller.load(DEMO_NAMESPACE, DEMO_EVENT_ID);
  if (loaded.ok && loaded.value)
    return { ok: true, origin: "restored", message: "Saved demo restored." };
  if (!loaded.ok && loaded.errors[0].code !== "STORAGE_UNAVAILABLE")
    return {
      ok: false,
      origin: "session-only",
      message: `${loaded.errors[0].code}: ${loaded.errors[0].message} Existing data was preserved. Use a new local workspace or recover the stored record explicitly.`,
    };

  const seed = createDemoDocument();
  const written = await persistence.save(seed, null, writeToken());
  if (
    !written.ok &&
    [
      "STORAGE_CONFLICT",
      "STORAGE_CORRUPT",
      "UNSUPPORTED_SCHEMA",
      "INVALID_DOCUMENT",
    ].includes(written.errors[0].code)
  )
    return {
      ok: false,
      origin: "session-only",
      message: `${written.errors[0].code}: ${written.errors[0].message} Existing data was preserved. Reload explicitly to recover it.`,
    };
  if (written.ok) {
    const reloaded = await controller.load(DEMO_NAMESPACE, DEMO_EVENT_ID, true);
    if (reloaded.ok)
      return { ok: true, origin: "seeded", message: "Demo initialized." };
  }

  try {
    buildInSession(controller);
  } catch (cause) {
    return {
      ok: false,
      origin: "session-only",
      message:
        cause instanceof Error
          ? `Demo could not be prepared: ${cause.message}`
          : "Demo could not be prepared.",
    };
  }
  return {
    ok: true,
    origin: "session-only",
    message: `Demo prepared in this tab only. ${!written.ok ? `${written.errors[0].code}: ${written.errors[0].message}` : "The written seed could not be restored."} No save success is claimed for this in-memory session.`,
  };
}
