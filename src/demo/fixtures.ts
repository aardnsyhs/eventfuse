import type {
  Activity,
  CriticalMilestone,
  Dependency,
  EngineLimits,
  Event,
  Incident,
  RecoveryOption,
} from "@/engine";

export interface DemoBaselineFixture {
  readonly baselineVersion: string;
  readonly event: Event;
  readonly activities: readonly Activity[];
  readonly dependencies: readonly Dependency[];
  readonly milestones: readonly CriticalMilestone[];
  readonly limits: EngineLimits;
}

export const corporateLaunchBaseline: DemoBaselineFixture = {
  baselineVersion: "launch-v1",
  event: {
    id: "launch",
    name: "Fictional corporate product launch",
    description: "Fictional demonstration data, not a customer event.",
    date: "2026-10-15",
    timezone: "Asia/Jakarta",
    location: "Fictional Jakarta convention hall",
    referenceInstant: "2026-10-15T01:00:00Z",
    createdAt: "2026-10-15T00:00:00Z",
    updatedAt: "2026-10-15T00:00:00Z",
    schemaVersion: 1,
  },
  activities: [
    {
      id: "power",
      eventId: "launch",
      name: "Power",
      ownerName: "Fictional power vendor",
      earliestStartMinute: 0,
      durationMinutes: 120,
      classification: "normal",
      notes: null,
      isMilestone: false,
    },
    {
      id: "audio",
      eventId: "launch",
      name: "Audio",
      ownerName: "Fictional AV vendor",
      earliestStartMinute: 120,
      durationMinutes: 120,
      classification: "normal",
      notes: null,
      isMilestone: false,
    },
    {
      id: "lighting",
      eventId: "launch",
      name: "Lighting",
      ownerName: "Fictional lighting vendor",
      earliestStartMinute: 120,
      durationMinutes: 120,
      classification: "normal",
      notes: null,
      isMilestone: false,
    },
    {
      id: "testing",
      eventId: "launch",
      name: "System Testing",
      ownerName: "Technical director",
      earliestStartMinute: 300,
      durationMinutes: 60,
      classification: "protected",
      notes: null,
      isMilestone: false,
    },
    {
      id: "rehearsal",
      eventId: "launch",
      name: "Rehearsal",
      ownerName: "Production manager",
      earliestStartMinute: 360,
      durationMinutes: 120,
      classification: "normal",
      notes: null,
      isMilestone: false,
    },
    {
      id: "doors",
      eventId: "launch",
      name: "Doors Open",
      ownerName: "Front of house",
      earliestStartMinute: 540,
      durationMinutes: 0,
      classification: "normal",
      notes: null,
      isMilestone: true,
    },
  ],
  dependencies: [
    {
      id: "d1",
      eventId: "launch",
      predecessorId: "power",
      successorId: "audio",
      type: "finish_to_start",
      lagMinutes: 0,
    },
    {
      id: "d2",
      eventId: "launch",
      predecessorId: "power",
      successorId: "lighting",
      type: "finish_to_start",
      lagMinutes: 0,
    },
    {
      id: "d3",
      eventId: "launch",
      predecessorId: "audio",
      successorId: "testing",
      type: "finish_to_start",
      lagMinutes: 0,
    },
    {
      id: "d4",
      eventId: "launch",
      predecessorId: "lighting",
      successorId: "testing",
      type: "finish_to_start",
      lagMinutes: 0,
    },
    {
      id: "d5",
      eventId: "launch",
      predecessorId: "testing",
      successorId: "rehearsal",
      type: "finish_to_start",
      lagMinutes: 0,
    },
    {
      id: "d6",
      eventId: "launch",
      predecessorId: "rehearsal",
      successorId: "doors",
      type: "finish_to_start",
      lagMinutes: 0,
    },
  ],
  milestones: [
    {
      id: "doors-deadline",
      eventId: "launch",
      activityId: "doors",
      deadlineMinute: 540,
      label: "Doors Open",
    },
  ],
  limits: {
    maxMinute: 10080,
    maxActivities: 500,
    maxDependencies: 5000,
    maxMilestones: 100,
    maxModifications: 1000,
    maxCauseEdges: 2000,
  },
} as const;

export const powerDelayIncident: Incident = {
  id: "vendor-delay",
  eventId: "launch",
  baselineVersion: "launch-v1",
  title: "Hypothetical power vendor delay: 240 minutes",
  description: "User-supplied hypothetical vendor arrival.",
  targetActivityId: "power",
  startDelayMinutes: 240,
  createdAt: "2026-10-15T00:10:00Z",
};

export interface DemoOptionFixture {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly costMinorUnits: number | null;
  readonly currency: string;
  readonly modifications: RecoveryOption["modifications"];
  readonly approvalStatus: RecoveryOption["approvalStatus"];
  readonly approvalRequirements: RecoveryOption["approvalRequirements"];
  readonly approvalContext: string | null;
  readonly assumptionNotes: readonly string[];
}

export const demoOptionA: DemoOptionFixture = {
  id: "demo-a-earlier-vendor",
  name: "Earlier vendor arrival",
  description: "Fictional conditional proposal, not operational authorization.",
  costMinorUnits: null,
  currency: "USD",
  approvalStatus: "pending",
  approvalContext: null,
  modifications: [
    {
      activityId: "power",
      field: "earliest_start",
      operation: "set",
      valueMinutes: 120,
    },
  ],
  assumptionNotes: [
    "Power vendor arrival at 10:00 is hypothetical until externally confirmed.",
  ],
  approvalRequirements: [
    {
      approverLabel: "Power vendor",
      condition:
        "Confirm arrival permitting Power to start at 10:00 Asia/Jakarta.",
    },
  ],
} as const;

export const demoOptionB: DemoOptionFixture = {
  id: "demo-b-parallel-compression",
  name: "Parallel setup compression",
  description: "Fictional conditional proposal, not operational authorization.",
  costMinorUnits: null,
  currency: "USD",
  approvalStatus: "pending",
  approvalContext: null,
  modifications: [
    {
      activityId: "audio",
      field: "duration",
      operation: "set",
      valueMinutes: 60,
    },
    {
      activityId: "lighting",
      field: "duration",
      operation: "set",
      valueMinutes: 60,
    },
  ],
  assumptionNotes: [
    "Revised setup methods and 60-minute durations require validation; no linear crew-savings guarantee.",
  ],
  approvalRequirements: [
    {
      approverLabel: "Technical director and relevant suppliers",
      condition:
        "Confirm revised methods and each 60-minute Audio/Lighting duration without shortening protected Testing.",
    },
  ],
} as const;
