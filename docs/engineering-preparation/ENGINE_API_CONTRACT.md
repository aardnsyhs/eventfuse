# Public engine API contract

Frozen MVP contract `freeze-1`, 2026-10-15. These declarations extend the contracts in DOMAIN_MODEL.md. File names below are a future Bolt file plan, not existing implementation modules.

```ts
export type ErrorCode = 'INVALID_SHAPE' | 'INVALID_TEXT' | 'INVALID_DATE'
  | 'INVALID_TIMEZONE' | 'UNSUPPORTED_SCHEMA' | 'INVALID_NUMBER'
  | 'OUT_OF_RANGE' | 'OVERFLOW' | 'LIMIT_EXCEEDED' | 'DUPLICATE_ID'
  | 'INVALID_REFERENCE' | 'EVENT_MISMATCH' | 'STALE_BASELINE'
  | 'SELF_DEPENDENCY' | 'DUPLICATE_DEPENDENCY' | 'CYCLE'
  | 'MILESTONE_DURATION' | 'DUPLICATE_MODIFICATION'
  | 'PROTECTED_DURATION' | 'APPROVAL_REQUIRED' | 'CURRENCY_MISMATCH'
  | 'UNKNOWN_CURRENCY' | 'INCIDENT_MISMATCH' | 'TOO_MANY_ALTERNATIVES'
  | 'SELECTION_MISMATCH';
export interface ValidationError {
  readonly code: ErrorCode;
  readonly path: string; // JSON Pointer, e.g. /baseline/dependencies/0/successorId
  readonly entityId: Id | null;
  readonly message: string;
  readonly relatedIds: readonly Id[];
}
export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly errors: readonly ValidationError[] };
export interface CommonRequest {
  readonly baseline: BaselineSnapshot;
  readonly currency: CurrencyCode;
  readonly limits: EngineLimits;
  readonly scenarioId: Id;
}
export type EngineRequest = CommonRequest & (
  | { readonly kind: 'baseline' }
  | { readonly kind: 'incident'; readonly incident: Incident }
  | { readonly kind: 'recovery'; readonly incident: Incident;
      readonly recovery: RecoveryOption }
);
export interface ComparisonRequest {
  readonly baseline: BaselineSnapshot;
  readonly currency: CurrencyCode;
  readonly limits: EngineLimits;
  readonly incident: Incident;
  readonly scenarioIds: {
    readonly baseline: Id;
    readonly incident: Id;
    readonly recoveries: Readonly<Record<Id, Id>>;
  };
  readonly alternatives: readonly RecoveryOption[];
}
export interface RecoveryComparison {
  readonly baseline: ScenarioResult;
  readonly unmitigated: ScenarioResult;
  readonly alternatives: readonly {
    readonly recoveryOptionId: Id;
    readonly result: Result<ScenarioResult>;
  }[];
}
export interface BriefMetadata {
  readonly id: Id;
  readonly authorLabel: string | null;
  readonly createdAt: IsoInstant;
  readonly nextActions: readonly string[];
  readonly assumptionsAndConstraints: readonly string[];
}
export declare function validateRequest(input: unknown): Result<EngineRequest>;
export declare function validateBaseline(
  input: unknown, mode: 'draft' | 'runnable'
): Result<BaselineSnapshot>;
export declare function parseRecoveryCost(
  input: RecoveryCostDraft, currency: CurrencyCode
): Result<number | null>;
export declare function calculate(request: EngineRequest): Result<ScenarioResult>;
export declare function compareRecoveries(request: ComparisonRequest): Result<RecoveryComparison>;
export declare function buildDecisionBrief(
  request: ComparisonRequest,
  selectedRecoveryOptionId: Id,
  metadata: BriefMetadata
): Result<DecisionBrief>;
```

## Behavior

`validateRequest` validates complete untrusted wire input, including graph integrity. `calculate` also validates, even for typed callers; type assertions must not bypass integrity. All APIs are synchronous, pure and total over supported inputs, returning error results for expected invalid input. No partial successful timing results on failure. Programmer defects may still throw; adapters report those as faults and never present stale results as current.

Baseline result compares with itself: deltas zero, shifted empty, no incident descendants; baseline breach diagnostics still apply. Incident result compares with freshly computed baseline. Recovery result computes baseline and unmitigated incident from exactly the supplied source revision before applying its option. Baseline and incident cost is explicitly zero in request currency, approvalStatus not_required, assumptionNotes/approvalRequirements empty and approvalContext null. Recovery carries its option's exact nullable cost/status/notes and normalized approval metadata. Every result carries OPERATIONAL_VALIDATION_REQUIRED; options with nonempty assumptionNotes carry UNVERIFIED_ASSUMPTIONS; pending options carry APPROVAL_PENDING; recovery cost null carries COST_NOT_ENTERED. Null is a valid, incomplete monetary estimate, not an engine validation failure. Use fixed warning text from a catalog so output is deterministic.

`compareRecoveries`: requires one to three options, unique option IDs and unique scenario IDs, exact incidentId match for every option, and exact currency match. Validate the shared baseline and incident first. A shared failure or request-level comparison inconsistency returns outer failure. A malformed modification or protected violation in one structurally identified option returns that option's failure alongside valid siblings; no valid-looking metrics for the invalid option. Return alternatives sorted by recoveryOptionId. Status selected has no arithmetic effect. Costs are alternatives, never summed together. Avoid hidden headline aggregation when multiple milestones exist.

`buildDecisionBrief` recomputes the comparison, requires a successfully calculated selected option whose status is selected, and snapshots baseline/unmitigated/selected results plus source metadata. comparisonOptionSnapshots contains the validated source options with successful results; comparisonResultSnapshots contains those results in the same option-ID order, including the selected result. Failed alternatives are omitted from both typed snapshot collections and must not acquire invented or narrated outcomes. Exactly one option in the provided comparison may be selected and it must match the selection parameter. A pending selected option remains conditional. A null-cost selected option is eligible; freeze null and retain COST_NOT_ENTERED in copy/print. Include supplied approver labels/conditions/context and warning text for every alternative mentioned in the brief and the fixed disclaimer: "Hypothetical simulation. Operational validation is required. Selection does not authorize work; pending approvals remain outstanding." No model-generated rationale, approvals, vendor facts or next actions. Metadata and source assumptions remain explicitly user supplied. The brief records per-milestone recovered time via scenarioSnapshot.milestoneImpacts, not an invented aggregate.

`validateBaseline` in draft mode validates identity, types, bounds and references/DAG among supplied entities, but accepts zero activities/milestones. Runnable mode additionally requires at least one of each. Missing mandatory event identity fields remain form drafts, not valid persisted BaselineSnapshots.

`parseRecoveryCost` uses the grammar and offline catalog in DOMAIN_MODEL: unknown/empty is null, explicit zero is 0, malformed text is INVALID_NUMBER at `/costDraft/text`, excessive precision or negative/unsafe amounts use OUT_OF_RANGE there, and unsupported currency is UNKNOWN_CURRENCY at `/currency`. Currency validates first, including for unknown amounts. Parser errors have entityId null and relatedIds empty. A successful parse does not validate the rest of an option.

An empty alternatives collection is an application empty state with baseline/incident results available through calculate; compareRecoveries requires 1–3 options and returns OUT_OF_RANGE at `/alternatives` for zero, TOO_MANY_ALTERNATIVES for more than three. No selection means brief preparation is disabled. No default preference is created when entering compare; Figma's preferred-A frames are later example states. Selection is explicit and idempotent.

## Error contract

JSON Pointer paths point into the request being evaluated. Numeric type errors use INVALID_NUMBER; valid integer outside configured limits uses OUT_OF_RANGE; unsafe arithmetic uses OVERFLOW. Endpoint absence uses INVALID_REFERENCE and relatedIds=[missing ID]; mismatched parent event uses EVENT_MISMATCH; outdated revision uses STALE_BASELINE. CYCLE uses path `/baseline/dependencies`, entityId null and relatedIds equal the actual closed cycle witness. Errors are sorted by path/code/entityId. Report independent errors at the same validation phase, then stop before phases that assume valid earlier data. For multiple semantic violations, do not guarantee exactly one error; golden invalid fixtures each isolate one violation.

Currency, IANA zone and ISO date validation use explicit boundary catalogs/parsers. Engine arithmetic has no network dependency. Keep human error text separate from stable machine codes. Storage errors are adapter errors, not scheduling validation errors.

Warning catalog for freeze-1 (entityId in parentheses):

| Code | Entity | Fixed message |
|---|---|---|
| OPERATIONAL_VALIDATION_REQUIRED | Event | Hypothetical simulation; operational validation is required. |
| APPROVAL_PENDING | Option | Required external confirmations remain pending; selection does not authorize work. |
| UNVERIFIED_ASSUMPTIONS | Option | User-supplied recovery assumptions remain unverified. |
| BASELINE_DEADLINE_BREACH | Critical milestone | The baseline already breaches this milestone deadline. |
| EXPLANATION_TRUNCATED | Activity | Causal explanation output is truncated; calculated timings and classification are complete. |
| COST_NOT_ENTERED | Option | Additional recovery cost: Not entered. Unknown is not zero. |

Deduplicate by `(code, entityId)` and sort as specified. Parameter-specific content belongs in typed metadata, not invented warning text. Comparison nested errors use paths from ComparisonRequest, e.g. `/alternatives/1/modifications/0/valueMinutes`; standalone calculate fixtures retain `/recovery/...`. Numeric recovery-cost errors use option.id as entityId. Missing optional approval fields normalize only as documented.

## Future file plan

`src/domain/types.ts`, `src/domain/validation.ts`, `src/engine/graph.ts`, `src/engine/schedule.ts`, `src/engine/scenarios.ts`, `src/engine/explanations.ts`, `src/engine/compare.ts`, `src/engine/brief.ts`, `src/engine/index.ts`. Only index exports supported APIs; callers never depend on graph internals. Export type declarations from the domain module. Full implementation and test files are deferred to Bolt.
