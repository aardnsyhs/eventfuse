import type { WorkspaceDocument } from "@/application/types";
import type {
  Activity,
  CriticalMilestone,
  Dependency,
  Event,
  Incident,
  RecoveryOption,
} from "@/engine";
import {
  corporateLaunchBaseline,
  demoOptionA,
  demoOptionB,
  powerDelayIncident,
} from "@/demo/fixtures";

export const DEMO_EVENT_ID = corporateLaunchBaseline.event.id;
export const DEMO_NAMESPACE = "demo" as const;
export const DEMO_INCIDENT_ID = "demo-incident-power-delay";
export const DEMO_OPTION_A_ID = "demo-a-earlier-vendor";
export const DEMO_OPTION_B_ID = "demo-b-parallel-compression";

export const demoEvent: Event = corporateLaunchBaseline.event;

const demoActivities: readonly Activity[] = corporateLaunchBaseline.activities;
const demoDependencies: readonly Dependency[] =
  corporateLaunchBaseline.dependencies;
const demoMilestones: readonly CriticalMilestone[] =
  corporateLaunchBaseline.milestones;

const demoIncident: Incident = {
  id: DEMO_INCIDENT_ID,
  eventId: DEMO_EVENT_ID,
  baselineVersion: "demo-baseline-1",
  title: powerDelayIncident.title,
  description: powerDelayIncident.description,
  targetActivityId: powerDelayIncident.targetActivityId,
  startDelayMinutes: powerDelayIncident.startDelayMinutes,
  createdAt: powerDelayIncident.createdAt,
};

function option(id: string, source: typeof demoOptionA): RecoveryOption {
  return {
    id,
    incidentId: DEMO_INCIDENT_ID,
    name: source.name,
    description: source.description,
    costMinorUnits: source.costMinorUnits,
    currency: source.currency,
    modifications: source.modifications,
    approvalStatus: source.approvalStatus,
    approvalRequirements: source.approvalRequirements,
    approvalContext: source.approvalContext,
    assumptionNotes: source.assumptionNotes,
    status: "draft",
  };
}

const demoOptionARecord = option(DEMO_OPTION_A_ID, demoOptionA);
const demoOptionBRecord = option(DEMO_OPTION_B_ID, demoOptionB);

export function createDemoDocument(): WorkspaceDocument {
  const baseline = {
    baselineVersion: "demo-baseline-1",
    event: demoEvent,
    activities: demoActivities,
    dependencies: demoDependencies,
    milestones: demoMilestones,
  };
  const editing = {
    baseline,
    incident: {
      baselineVersion: baseline.baselineVersion,
      targetActivityId: demoIncident.targetActivityId,
      startDelayMinutes: demoIncident.startDelayMinutes,
      title: demoIncident.title,
      description: demoIncident.description,
    },
    recoveries: {},
  };
  return {
    schemaVersion: 1,
    namespace: DEMO_NAMESPACE,
    currency: "USD",
    limits: { ...corporateLaunchBaseline.limits },
    storageRevision: "demo-seed",
    nextSequence: 100,
    currentBaselineVersion: baseline.baselineVersion,
    baselineVersions: { [baseline.baselineVersion]: baseline },
    activeIncidentId: demoIncident.id,
    incidents: { [demoIncident.id]: demoIncident },
    recoveryOptions: {
      [demoOptionARecord.id]: demoOptionARecord,
      [demoOptionBRecord.id]: demoOptionBRecord,
    },
    selectedOptionByIncident: {},
    decisionBriefs: [],
    editing,
  };
}

export const demoCatalog = {
  incidentTitle: powerDelayIncident.title,
  options: [
    { id: DEMO_OPTION_A_ID, label: demoOptionA.name },
    { id: DEMO_OPTION_B_ID, label: demoOptionB.name },
  ],
} as const;
