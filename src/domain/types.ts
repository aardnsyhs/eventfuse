export type Id = string
export type Minute = number
export type IsoInstant = string
export type IsoDate = string
export type CurrencyCode = string
export type Classification = 'normal' | 'approval_required' | 'protected'
export type ApprovalStatus = 'not_required' | 'pending' | 'confirmed'
export type RecoveryCostDraft =
  | { readonly kind: 'not_entered' }
  | { readonly kind: 'editing'; readonly text: string }

export interface ApprovalRequirement {
  readonly approverLabel: string
  readonly condition: string
}

export interface Event {
  readonly id: Id
  readonly name: string
  readonly description: string | null
  readonly date: IsoDate
  readonly timezone: string
  readonly location: string | null
  readonly referenceInstant: IsoInstant
  readonly createdAt: IsoInstant
  readonly updatedAt: IsoInstant
  readonly schemaVersion: 1
}

export interface Activity {
  readonly id: Id
  readonly eventId: Id
  readonly name: string
  readonly ownerName: string | null
  readonly earliestStartMinute: Minute
  readonly durationMinutes: Minute
  readonly classification: Classification
  readonly notes: string | null
  readonly isMilestone: boolean
}

export interface Dependency {
  readonly id: Id
  readonly eventId: Id
  readonly predecessorId: Id
  readonly successorId: Id
  readonly type: 'finish_to_start'
  readonly lagMinutes: Minute
}

export interface CriticalMilestone {
  readonly id: Id
  readonly eventId: Id
  readonly activityId: Id
  readonly deadlineMinute: Minute
  readonly label: string
}

export interface BaselineSnapshot {
  readonly baselineVersion: string
  readonly event: Event
  readonly activities: readonly Activity[]
  readonly dependencies: readonly Dependency[]
  readonly milestones: readonly CriticalMilestone[]
}

export interface Incident {
  readonly id: Id
  readonly eventId: Id
  readonly baselineVersion: string
  readonly title: string
  readonly description: string | null
  readonly targetActivityId: Id
  readonly startDelayMinutes: Minute
  readonly createdAt: IsoInstant
}

export type RecoveryModification =
  | { readonly activityId: Id; readonly field: 'earliest_start'; readonly operation: 'set' | 'add'; readonly valueMinutes: number }
  | { readonly activityId: Id; readonly field: 'duration'; readonly operation: 'set' | 'add'; readonly valueMinutes: number }

export interface RecoveryOption {
  readonly id: Id
  readonly incidentId: Id
  readonly name: string
  readonly description: string | null
  readonly costMinorUnits: number | null
  readonly currency: CurrencyCode
  readonly modifications: readonly RecoveryModification[]
  readonly approvalStatus: ApprovalStatus
  readonly approvalRequirements?: readonly ApprovalRequirement[]
  readonly approvalContext?: string | null
  readonly assumptionNotes: readonly string[]
  readonly status: 'draft' | 'selected'
}

export interface EngineLimits {
  readonly maxMinute: number
  readonly maxActivities: number
  readonly maxDependencies: number
  readonly maxMilestones: number
  readonly maxModifications: number
  readonly maxCauseEdges: number
}

export const DEFAULT_LIMITS: EngineLimits = {
  maxMinute: 10080,
  maxActivities: 500,
  maxDependencies: 5000,
  maxMilestones: 100,
  maxModifications: 1000,
  maxCauseEdges: 2000,
}

export interface ActivityTiming { readonly startMinute: Minute; readonly finishMinute: Minute }
export interface TimingDelta { readonly activityId: Id; readonly startDeltaMinutes: number; readonly finishDeltaMinutes: number }
export interface MilestoneImpact {
  readonly milestoneId: Id
  readonly activityId: Id
  readonly deadlineMinute: Minute
  readonly baselineFinishMinute: Minute
  readonly finishMinute: Minute
  readonly delayFromBaselineMinutes: number
  readonly breachMinutes: number
  readonly baselineBreachMinutes: number
  readonly breachDeltaMinutes: number
  readonly recoveredMinutes: number | null
}
export interface CauseEdge {
  readonly constraintContext: 'baseline' | 'scenario'
  readonly predecessorId: Id
  readonly successorId: Id
  readonly dependencyId: Id
  readonly predecessorFinishMinute: Minute
  readonly lagMinutes: Minute
  readonly candidateStartMinute: Minute
}
export interface CausalExplanation {
  readonly activityId: Id
  readonly bindingEarliestStart: boolean
  readonly bindingDependencyIds: readonly Id[]
  readonly baselineBindingDependencyIds: readonly Id[]
  readonly startChangedDirectly: boolean
  readonly durationChangedDirectly: boolean
  readonly incidentReachable: boolean
  readonly startCauseKinds: readonly ('incident' | 'recovery')[]
  readonly finishCauseKinds: readonly ('incident' | 'recovery')[]
  readonly causeEdges: readonly CauseEdge[]
  readonly truncated: boolean
}
export type WarningCode = 'OPERATIONAL_VALIDATION_REQUIRED' | 'APPROVAL_PENDING' | 'UNVERIFIED_ASSUMPTIONS' | 'BASELINE_DEADLINE_BREACH' | 'EXPLANATION_TRUNCATED' | 'COST_NOT_ENTERED'
export interface EngineWarning { readonly code: WarningCode; readonly entityId: Id; readonly message: string }
export interface ScenarioResult {
  readonly engineVersion: '1'
  readonly scenarioId: string
  readonly kind: 'baseline' | 'incident' | 'recovery'
  readonly eventId: Id
  readonly baselineVersion: string
  readonly incidentId: Id | null
  readonly recoveryOptionId: Id | null
  readonly topologicalOrder: readonly Id[]
  readonly activityTimings: Readonly<Record<Id, ActivityTiming>>
  readonly activityDeltas: readonly TimingDelta[]
  readonly shiftedActivityIds: readonly Id[]
  readonly incidentDescendantIds: readonly Id[]
  readonly downstreamAffectedActivityIds: readonly Id[]
  readonly milestoneImpacts: readonly MilestoneImpact[]
  readonly affectedMilestones: readonly MilestoneImpact[]
  readonly deadlineBreaches: readonly MilestoneImpact[]
  readonly recoveryCostMinorUnits: number | null
  readonly currency: CurrencyCode
  readonly approvalStatus: ApprovalStatus
  readonly approvalRequirements: readonly ApprovalRequirement[]
  readonly approvalContext: string | null
  readonly assumptionNotes: readonly string[]
  readonly explanationPaths: readonly CausalExplanation[]
  readonly validationWarnings: readonly EngineWarning[]
}
export interface BriefMetadata {
  readonly id: Id
  readonly authorLabel: string | null
  readonly createdAt: IsoInstant
  readonly nextActions: readonly string[]
  readonly assumptionsAndConstraints: readonly string[]
}

export interface DecisionBrief {
  readonly id: Id
  readonly eventId: Id
  readonly incidentId: Id
  readonly selectedRecoveryOptionId: Id
  readonly baselineVersion: string
  readonly authorLabel: string | null
  readonly createdAt: IsoInstant
  readonly eventSnapshot: Event
  readonly incidentSnapshot: Incident
  readonly recoverySnapshot: RecoveryOption
  readonly comparisonOptionSnapshots: readonly RecoveryOption[]
  readonly comparisonResultSnapshots: readonly ScenarioResult[]
  readonly baselineSnapshot: ScenarioResult
  readonly unmitigatedSnapshot: ScenarioResult
  readonly scenarioSnapshot: ScenarioResult
  readonly assumptionsAndConstraints: readonly string[]
  readonly nextActions: readonly string[]
  readonly hypothetical: true
  readonly approvalDisclaimer: string
}
