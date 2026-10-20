import type {
  Activity,
  ApprovalStatus,
  BaselineSnapshot,
  BriefMetadata,
  ComparisonRequest,
  CriticalMilestone,
  DecisionBrief,
  Dependency,
  EngineLimits,
  Event,
  Incident,
  RecoveryComparison,
  RecoveryCostDraft,
  RecoveryModification,
  RecoveryOption,
  ScenarioResult,
  ValidationError,
} from "../engine/index";

export type Namespace = "demo" | "workspace";
export type AppErrorCode =
  | "VALIDATION"
  | "INVALID_INPUT"
  | "NOT_READY"
  | "NOT_FOUND"
  | "ID_EXISTS"
  | "STALE_CONTEXT"
  | "MILESTONE_RECONCILIATION_REQUIRED"
  | "APPROVAL_CONTEXT_REQUIRED"
  | "UNSAVED_CHANGES"
  | "INVALID_DOCUMENT"
  | "UNSUPPORTED_SCHEMA"
  | "STORAGE_CORRUPT"
  | "STORAGE_TOO_LARGE"
  | "STORAGE_UNAVAILABLE"
  | "STORAGE_QUOTA"
  | "STORAGE_CONFLICT"
  | "LOCK_UNAVAILABLE"
  | "STORAGE_BUSY";
export interface AppError {
  readonly code: AppErrorCode;
  readonly message: string;
  readonly path: string;
  readonly validationErrors?: readonly ValidationError[];
}
export type AppResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly errors: readonly AppError[] };
export interface IncidentDraft {
  readonly baselineVersion: string;
  readonly targetActivityId: string;
  readonly startDelayMinutes: number;
  readonly title: string;
  readonly description: string | null;
}
export interface EditingState {
  readonly baseline: BaselineSnapshot;
  readonly incident: IncidentDraft | null;
  readonly recoveries: Readonly<Record<string, RecoveryOption>>;
}
export interface WorkspaceDocument {
  readonly schemaVersion: 1;
  readonly namespace: Namespace;
  readonly currency: string;
  readonly limits: EngineLimits;
  readonly storageRevision: string;
  readonly nextSequence: number;
  readonly currentBaselineVersion: string | null;
  readonly baselineVersions: Readonly<Record<string, BaselineSnapshot>>;
  readonly activeIncidentId: string | null;
  readonly incidents: Readonly<Record<string, Incident>>;
  readonly recoveryOptions: Readonly<Record<string, RecoveryOption>>;
  readonly selectedOptionByIncident: Readonly<Record<string, string>>;
  readonly decisionBriefs: readonly DecisionBrief[];
  readonly editing: EditingState;
}
export interface CalculationState {
  readonly status:
    | "empty"
    | "dirty"
    | "validating"
    | "invalid"
    | "ready"
    | "applied"
    | "stale";
  readonly baseline: ScenarioResult | null;
  readonly incident: ScenarioResult | null;
  readonly comparison: RecoveryComparison | null;
}
export interface PersistenceState {
  readonly status:
    | "idle"
    | "loading"
    | "saving"
    | "saved"
    | "unsaved"
    | "error";
  readonly expectedRevision: string | null;
  readonly error: AppError | null;
}
export interface ApplicationState {
  readonly document: WorkspaceDocument | null;
  readonly editing: EditingState | null;
  readonly generation: number;
  readonly baselineValidation: "unknown" | "valid" | "invalid";
  readonly calculation: CalculationState;
  readonly persistence: PersistenceState;
  readonly errors: readonly AppError[];
}
export type Command =
  | {
      readonly type: "event.create";
      readonly event: Event;
      readonly currency: string;
      readonly namespace?: Namespace;
    }
  | {
      readonly type: "event.edit";
      readonly patch: Partial<
        Omit<Event, "id" | "createdAt" | "schemaVersion">
      >;
    }
  | { readonly type: "activity.put"; readonly activity: Activity }
  | {
      readonly type: "activity.remove";
      readonly id: string;
      readonly milestoneReplacements?: readonly CriticalMilestone[];
    }
  | { readonly type: "dependency.put"; readonly dependency: Dependency }
  | { readonly type: "dependency.remove"; readonly id: string }
  | { readonly type: "milestone.put"; readonly milestone: CriticalMilestone }
  | { readonly type: "milestone.remove"; readonly id: string }
  | { readonly type: "baseline.validate" }
  | { readonly type: "baseline.apply"; readonly expectedVersion: string | null }
  | { readonly type: "baseline.restoreDraft"; readonly version: string }
  | { readonly type: "incident.configure"; readonly draft: IncidentDraft }
  | {
      readonly type: "incident.apply";
      readonly expectedVersion: string;
      readonly createdAt: string;
    }
  | {
      readonly type: "incident.reset";
      readonly expectedIncidentId: string;
      readonly createdAt: string;
      readonly confirmed: boolean;
    }
  | {
      readonly type: "recovery.add";
      readonly expectedIncidentId: string;
      readonly option: Omit<RecoveryOption, "id" | "incidentId" | "status">;
    }
  | {
      readonly type: "recovery.edit";
      readonly expectedIncidentId: string;
      readonly id: string;
      readonly patch: Partial<
        Omit<RecoveryOption, "id" | "incidentId" | "status">
      >;
    }
  | {
      readonly type: "recovery.cost";
      readonly expectedIncidentId: string;
      readonly id: string;
      readonly draft: RecoveryCostDraft;
    }
  | {
      readonly type: "recovery.modification.put";
      readonly expectedIncidentId: string;
      readonly id: string;
      readonly modification: RecoveryModification;
    }
  | {
      readonly type: "recovery.modification.remove";
      readonly expectedIncidentId: string;
      readonly id: string;
      readonly activityId: string;
      readonly field: RecoveryModification["field"];
    }
  | {
      readonly type: "recovery.approval";
      readonly expectedIncidentId: string;
      readonly id: string;
      readonly approvalStatus: ApprovalStatus;
      readonly context: string | null;
    }
  | {
      readonly type: "recovery.apply";
      readonly expectedIncidentId: string;
      readonly id: string;
    }
  | {
      readonly type: "recovery.remove";
      readonly expectedIncidentId: string;
      readonly id: string;
    }
  | { readonly type: "recovery.compare"; readonly expectedIncidentId: string }
  | {
      readonly type: "selection.set";
      readonly expectedIncidentId: string;
      readonly id: string;
    }
  | { readonly type: "selection.clear"; readonly expectedIncidentId: string }
  | {
      readonly type: "brief.prepare";
      readonly expectedIncidentId: string;
      readonly metadata: BriefMetadata;
    }
  | {
      readonly type: "demo.reset";
      readonly seed: WorkspaceDocument;
      readonly confirmed: boolean;
    };
export type CommandResult =
  | {
      readonly ok: true;
      readonly state: ApplicationState;
      readonly brief?: DecisionBrief;
    }
  | {
      readonly ok: false;
      readonly state: ApplicationState;
      readonly errors: readonly AppError[];
    };
export interface PersistencePort {
  load(
    namespace: Namespace,
    eventId: string,
  ): Promise<AppResult<WorkspaceDocument | null>>;
  save(
    document: WorkspaceDocument,
    expectedRevision: string | null,
    writeRevision: string,
  ): Promise<AppResult<WorkspaceDocument>>;
  list(
    namespace: Namespace,
  ): Promise<
    AppResult<readonly { readonly eventId: string; readonly name: string }[]>
  >;
}
export type ComparisonSource = ComparisonRequest;
