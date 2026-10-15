# EventFuse domain model

Source: [PRD v1.0](../PRD.md), 2026-10-15, sections 5–7. Status: frozen MVP contract, revision `freeze-1` (2026-10-15), incorporating the user's contract-freeze decisions. [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md) is the resolved decision register; [CONTRACT_FREEZE_REPORT.md](CONTRACT_FREEZE_REPORT.md) records the read-only Figma audit and explicit amendments to PRD logical schemas. This package specifies a future implementation. It does not implement the application.

## Contract conventions

All objects and arrays are readonly. Runtime validation is mandatory: TypeScript does not validate JSON. IDs are opaque, nonempty, case-sensitive strings, unique within each entity collection. Sort IDs using ordinal string comparison, never locale-dependent collation. Use canonical ASCII fixture IDs; reject prototype-sensitive IDs `__proto__`, `constructor`, and `prototype` at the JSON boundary. Maps in wire data are ordinary JSON objects, built safely with own-property checks.

Minutes and entered money are safe integers. The frozen default minute range is 0–10,080 inclusive (seven elapsed days); this is a configurable engineering limit adopted under Q07. Negative `add` values are allowed only for recovery operations whose final field values remain in range. Each intermediate sum, dependency finish plus lag, and final finish must remain safe and within the minute limit. All supported numeric limits travel in the request.

`referenceInstant` supplies the production start reference required by F02 but omitted from section 6's Event schema. Store a minute-aligned UTC ISO instant, for example `2026-10-15T01:00:00Z` (08:00 Asia/Jakarta). Activity values are elapsed minutes from this instant, including across midnight or daylight-saving transitions. Event `date` is the local event date, not necessarily the local date of production start. Resolve local calendar input to an instant before engine invocation; reject ambiguous or nonexistent wall times unless explicitly disambiguated. Never parse an unzoned datetime using the host timezone. The engine only adds elapsed integer minutes; formatting belongs to an adapter.

An entered cost is a nonnegative safe integer in the currency's ISO 4217 minor units; `null` explicitly means "Not entered". Require a supported currency even when amount is null. No exchange conversion, inferred prices, `null ?? 0`, or numeric display of an unknown. Zero means explicitly supplied zero. A comparison rejects mixed currencies, including null or zero amounts. See the cost-state contract below.

## TypeScript contracts

```ts
export type Id = string;
export type Minute = number;
export type IsoInstant = string;
export type IsoDate = string;
export type CurrencyCode = string;
export type Classification = 'normal' | 'approval_required' | 'protected';
export type ApprovalStatus = 'not_required' | 'pending' | 'confirmed';
export type RecoveryCostDraft =
  | { readonly kind: 'not_entered' }
  | { readonly kind: 'editing'; readonly text: string };
export interface ApprovalRequirement {
  readonly approverLabel: string;
  readonly condition: string;
}

export interface Event {
  readonly id: Id;
  readonly name: string;
  readonly description: string | null;
  readonly date: IsoDate;
  readonly timezone: string;
  readonly location: string | null;
  readonly referenceInstant: IsoInstant;
  readonly createdAt: IsoInstant;
  readonly updatedAt: IsoInstant;
  readonly schemaVersion: 1;
}
export interface Activity {
  readonly id: Id;
  readonly eventId: Id;
  readonly name: string;
  readonly ownerName: string | null;
  readonly earliestStartMinute: Minute;
  readonly durationMinutes: Minute;
  readonly classification: Classification;
  readonly notes: string | null;
  readonly isMilestone: boolean;
}
export interface Dependency {
  readonly id: Id;
  readonly eventId: Id;
  readonly predecessorId: Id;
  readonly successorId: Id;
  readonly type: 'finish_to_start';
  readonly lagMinutes: Minute;
}
export interface CriticalMilestone {
  readonly id: Id;
  readonly eventId: Id;
  readonly activityId: Id;
  readonly deadlineMinute: Minute;
  readonly label: string;
}
export interface BaselineSnapshot {
  readonly baselineVersion: string;
  readonly event: Event;
  readonly activities: readonly Activity[];
  readonly dependencies: readonly Dependency[];
  readonly milestones: readonly CriticalMilestone[];
}
export interface Incident {
  readonly id: Id;
  readonly eventId: Id;
  readonly baselineVersion: string;
  readonly title: string;
  readonly description: string | null;
  readonly targetActivityId: Id;
  readonly startDelayMinutes: Minute;
  readonly createdAt: IsoInstant;
}
export type RecoveryModification =
  | { readonly activityId: Id; readonly field: 'earliest_start';
      readonly operation: 'set' | 'add'; readonly valueMinutes: number }
  | { readonly activityId: Id; readonly field: 'duration';
      readonly operation: 'set' | 'add'; readonly valueMinutes: number };
export interface RecoveryOption {
  readonly id: Id;
  readonly incidentId: Id;
  readonly name: string;
  readonly description: string | null;
  readonly costMinorUnits: number | null;
  readonly currency: CurrencyCode;
  readonly modifications: readonly RecoveryModification[];
  readonly approvalStatus: ApprovalStatus;
  readonly approvalRequirements?: readonly ApprovalRequirement[];
  readonly approvalContext?: string | null;
  readonly assumptionNotes: readonly string[];
  readonly status: 'draft' | 'selected';
}
export interface EngineLimits {
  readonly maxMinute: number;
  readonly maxActivities: number;
  readonly maxDependencies: number;
  readonly maxMilestones: number;
  readonly maxModifications: number;
  readonly maxCauseEdges: number;
}
export interface ActivityTiming {
  readonly startMinute: Minute;
  readonly finishMinute: Minute;
}
export interface TimingDelta {
  readonly activityId: Id;
  readonly startDeltaMinutes: number;
  readonly finishDeltaMinutes: number;
}
export interface MilestoneImpact {
  readonly milestoneId: Id;
  readonly activityId: Id;
  readonly deadlineMinute: Minute;
  readonly baselineFinishMinute: Minute;
  readonly finishMinute: Minute;
  readonly delayFromBaselineMinutes: number;
  readonly breachMinutes: number;
  readonly baselineBreachMinutes: number;
  readonly breachDeltaMinutes: number;
  readonly recoveredMinutes: number | null;
}
export interface CauseEdge {
  readonly constraintContext: 'baseline' | 'scenario';
  readonly predecessorId: Id;
  readonly successorId: Id;
  readonly dependencyId: Id;
  readonly predecessorFinishMinute: Minute;
  readonly lagMinutes: Minute;
  readonly candidateStartMinute: Minute;
}
export interface CausalExplanation {
  readonly activityId: Id;
  readonly bindingEarliestStart: boolean;
  readonly bindingDependencyIds: readonly Id[];
  readonly baselineBindingDependencyIds: readonly Id[];
  readonly startChangedDirectly: boolean;
  readonly durationChangedDirectly: boolean;
  readonly incidentReachable: boolean;
  readonly startCauseKinds: readonly ('incident' | 'recovery')[];
  readonly finishCauseKinds: readonly ('incident' | 'recovery')[];
  readonly causeEdges: readonly CauseEdge[];
  readonly truncated: boolean;
}
export type WarningCode = 'OPERATIONAL_VALIDATION_REQUIRED'
  | 'APPROVAL_PENDING' | 'UNVERIFIED_ASSUMPTIONS'
  | 'BASELINE_DEADLINE_BREACH' | 'EXPLANATION_TRUNCATED' | 'COST_NOT_ENTERED';
export interface EngineWarning {
  readonly code: WarningCode;
  readonly entityId: Id;
  readonly message: string;
}
export interface ScenarioResult {
  readonly engineVersion: '1';
  readonly scenarioId: string;
  readonly kind: 'baseline' | 'incident' | 'recovery';
  readonly eventId: Id;
  readonly baselineVersion: string;
  readonly incidentId: Id | null;
  readonly recoveryOptionId: Id | null;
  readonly topologicalOrder: readonly Id[];
  readonly activityTimings: Readonly<Record<Id, ActivityTiming>>;
  readonly activityDeltas: readonly TimingDelta[];
  readonly shiftedActivityIds: readonly Id[];
  readonly incidentDescendantIds: readonly Id[];
  readonly downstreamAffectedActivityIds: readonly Id[];
  readonly milestoneImpacts: readonly MilestoneImpact[];
  readonly affectedMilestones: readonly MilestoneImpact[];
  readonly deadlineBreaches: readonly MilestoneImpact[];
  readonly recoveryCostMinorUnits: number | null;
  readonly currency: CurrencyCode;
  readonly approvalStatus: ApprovalStatus;
  readonly approvalRequirements: readonly ApprovalRequirement[];
  readonly approvalContext: string | null;
  readonly assumptionNotes: readonly string[];
  readonly explanationPaths: readonly CausalExplanation[];
  readonly validationWarnings: readonly EngineWarning[];
}
export interface DecisionBrief {
  readonly id: Id;
  readonly eventId: Id;
  readonly incidentId: Id;
  readonly selectedRecoveryOptionId: Id;
  readonly baselineVersion: string;
  readonly authorLabel: string | null;
  readonly createdAt: IsoInstant;
  readonly eventSnapshot: Event;
  readonly incidentSnapshot: Incident;
  readonly recoverySnapshot: RecoveryOption;
  readonly comparisonOptionSnapshots: readonly RecoveryOption[];
  readonly comparisonResultSnapshots: readonly ScenarioResult[];
  readonly baselineSnapshot: ScenarioResult;
  readonly unmitigatedSnapshot: ScenarioResult;
  readonly scenarioSnapshot: ScenarioResult;
  readonly assumptionsAndConstraints: readonly string[];
  readonly nextActions: readonly string[];
  readonly hypothetical: true;
  readonly approvalDisclaimer: string;
}
```

## Integrity and validation

Validate complete JSON shape before graph traversal: no coercion, NaN, Infinity, fractions, malformed dates, unsupported enums, null for nonnullable fields, unknown schema versions, or unexpected keys in versioned documents. costMinorUnits is required but nullable; absence/undefined is INVALID_SHAPE, not zero or null. Trim names at entry and reject empty names. Frozen text caps: names 200 characters; descriptions/notes/approvalContext 10,000; assumption/next-action items 2,000, 100 items each; approval requirement labels 200, conditions 2,000, maximum 100 requirements. Validate actual calendar dates and known IANA zones in a boundary adapter. Timestamps must be minute-aligned for `referenceInstant`, valid UTC instants for audit fields, and `updatedAt >= createdAt`.

Every child eventId must equal its containing event.id. All endpoints, incident targets, milestone activity references and modification targets must exist in that snapshot. Incident baselineVersion must exactly match. Recovery incidentId must match. Reject duplicate IDs, duplicate predecessor/successor pairs, self edges, negative lag, and cycles. Empty workspaces may persist, but a runnable baseline requires at least one activity and one critical milestone. Critical milestones may reference a nonzero-duration activity (PRD says normally zero); measure its finish. `isMilestone: true` requires zero duration; zero-duration ordinary activities remain valid. Multiple critical deadlines may reference one activity but retain distinct IDs and metrics.

An option may modify each (activityId, field) at most once. All-or-nothing validation prevents partial application. Recovery cannot shorten a protected activity compared with its baseline duration. An activity classified `approval_required` requires `pending` or `confirmed` when modified. An option with nonempty approvalRequirements also requires pending/confirmed. Pending interventions calculate conditionally with warnings; selecting an option never confirms approval. A protected classification does not by itself prohibit earliest-start changes. These are the adopted Q05/Q06 decisions.

Approval requirements and context are explanatory records, not a new approval workflow. Missing optional fields in existing fixture inputs normalize to [] and null in results; never invent an approver. New demo options explicitly name the vendor or technical director/suppliers and their conditions. Application commands recording confirmed status require nonblank externally verified context; the arithmetic engine accepts the recorded status as supplied and does not authenticate it. Older confirmed fixtures without context remain valid regression data and imply no verified real-world authorization. Unknown requirements must be labeled "Approver/condition not recorded" when relevant.

On activity deletion: author a new baseline revision atomically, remove its dependency edges, invalidate active editing drafts/selections that reference the deleted task in that new revision, and require explicit reconciliation of critical milestones before committing deletion. Preserve old baseline snapshots, incidents/options pinned to them, and historic decision briefs. Never leave dangling references within any committed revision. Every baseline edit creates a new opaque baselineVersion. Existing scenarios stay pinned to their captured version; they are not silently retargeted. An old revision can be inspected/recalculated using its own retained snapshot, labeled as historical relative to the current blueprint. A scenario combined with a different revision is STALE_BASELINE and requires explicit recreation/rebase. At most one option per incident is selected in persisted application state; selection is outside scheduling.

## Cost states, validation and calculation eligibility

`RecoveryCostDraft` is form state, separate from a valid RecoveryOption. An empty/whitespace-only field is explicitly parsed to null; any other editing text must parse exactly or remain an invalid draft. A partial minus sign, letters, negative value, exponent notation, grouping separator, nonfinite value, too many decimal digits, or unsafe integer cannot become unknown or zero. The parser accepts ASCII digits, optionally one period with 1..currencyExponent fractional digits, and trims surrounding whitespace. A zero-exponent currency permits digits only. Convert with string/integer arithmetic and reject overflow, never binary-float multiplication or rounding. Currency is a required separate validated selection. Changing currency never converts an amount: require explicit re-entry or an explicit clear-to-null action before commit.

Offline MVP catalog, frozen with this contract: USD=2, GBP=2, EUR=2, IDR=2, JPY=0 fractional digits. Bundle this allowlist in the future application; no runtime metadata fetch or FX. Other codes return UNKNOWN_CURRENCY until a deliberate catalog update. Demo currency is USD because the canonical engineering inputs already use USD; local event timezone does not imply currency. Figma's GBP labels are sample metadata to reconcile, not converted values.

| Committed amount | Timing / comparison eligibility | Cost output | Selection / brief |
|---|---|---|---|
| null | Allowed when scheduling inputs valid | null + COST_NOT_ENTERED; display Not entered | Allowed; unknown warning retained |
| 0 explicitly entered | Allowed | 0 in selected currency; no unknown warning | Allowed; never implies work is free without the user's estimate |
| Positive safe integer | Allowed | Exact supplied minor units | Allowed with supplied assumptions |
| Missing/malformed/negative/unsafe | Invalid option; no current outcome | Validation error; no monetary result | Block until repaired |

`status: draft` means a committed, unselected proposal, not a malformed form. A selected option may still have null cost or pending approval. Null costs never participate in arithmetic, totals or cost ranking; show cost comparison as incomplete. There is no automatic winner or inferred cheapest option. Baseline/incident recovery cost 0 is the known absence of an intervention cost in this model and does not estimate total event cost. A full DecisionBrief freezes selected and other comparison source/options/results to support Figma's reference to alternative B; failed alternatives have no result snapshot and cannot be narrated as feasible.

## Serialization and ownership

Use JSON-compatible plain values only: no Date, Map, Set, bigint, undefined, class instances or function values. Null is explicit. Omitted lag is normalized to zero only by the ingestion adapter before engine validation. The engine requires all fields except explicitly optional approval metadata. Numbers are JSON integers with runtime safe-integer checks. Currency metadata validation occurs before passing a validated request to arithmetic.

Persist source records and schemaVersion in one local envelope; computed results are disposable caches. Decision briefs intentionally persist full validated snapshots with provenance. Never restore an arbitrary saved result as authoritative current output. Caller creates IDs, revisions and timestamps; engine never reads clock, random values, browser, network or storage. Canonical serialization sorts object keys and ID collections; arrays with semantic order (notes, next actions) preserve order. Entity input ordering never changes calculated schedules.
