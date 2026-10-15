# Bolt integration handoff

This is an engineering specification package for future implementation inside Bolt.new. It contains no application implementation and prescribes no visual interface. Authoritative product source: ../PRD.md v1.0. Use freeze-1 decisions in OPEN_QUESTIONS and the reconciliation report CONTRACT_FREEZE_REPORT as binding implementation inputs; no domain question remains pending.

## Implementation sequence

1. Add TypeScript contracts and runtime validators from DOMAIN_MODEL and ENGINE_API_CONTRACT. Use the adopted limits, bundled currency allowlist, nullable-cost parser and explicit local-time conversion policy.
2. Implement DAG validation and scheduling as pure TypeScript. Import GOLDEN_TEST_FIXTURES as data; make their assertions pass before binding any rendering.
3. Implement immutable incident/recovery calculation, explanation causality and comparison. Verify error behavior, signed metrics and protected-activity rules.
4. Implement application commands and a local persistence adapter; test revisions, resets, corruption and storage failure.
5. Connect the independent Figma design to typed inputs and outputs without moving scheduling rules into components. Implement source editing, compare selection and readable brief export.
6. Run all P0 acceptance tests and applicable P1 tests, then measure performance. Hosting and submission are separate work authorized later.

## Required inputs and outputs

Pass a fully validated baseline snapshot, revision, configured limits, currency and caller-owned scenario ID. Incident/recovery requests add their discriminated fields. The baseline must contain the reference UTC instant, IANA display timezone, at least one activity and at least one critical deadline. See fixtures for exact payloads.

`calculate` returns `Result<ScenarioResult>`. On success, consume activityTimings, signed deltas, shifted IDs, reachable descendants, incident-caused downstream changes, per-milestone impact/breach/recovered values, cost, approvals, assumptions and structured explanations/warnings. Use the baseline and incident rows from compareRecoveries so every alternative is grounded in the same revision and incident. Never derive operational metrics from rendered coordinates or text labels.

On failure, preserve editable inputs and display field/entity errors using JSON Pointer and error codes. Do not show a previous successful result as if it represented invalid current inputs. A failed alternative has no timing or cost outcome; valid siblings may remain available with their identity explicit. Reconcile deleted entities through commands before recalculation.

## Recalculation and state

Engine calls are synchronous for the intended small demo. Explicit Apply/Save commits a validated draft and recalculates after a source/incident/option change; selection alone need not recalculate timings. Optional input debounce belongs to application orchestration, not the engine. Empty/incomplete drafts are not engine requests.

Application calculation state is a discriminated union: `idle` (no runnable input), `dirty` (changed form draft, last result not current), `validating` (explicit Apply/Save), `calculating` (request/revision token), `valid` (matching token/result), `invalid` (matching token/errors), or `fault` (unexpected execution failure). Dirty/validating/calculating/invalid/fault withhold current results and disable compare/brief; a last valid result may be retained only with an explicit Not current label. Form changes do not recalculate or save until Apply/Save. Unknown committed cost alone does not make a result dirty or invalid. Never associate an old result with a new request. If future async work is introduced, discard responses whose token/revision does not match. Loading status is only necessary for actual deferred work. No artificial sleeps or fake progress.

Baseline ownership, scenarios and storage status stay in application state. The engine neither persists nor mutates data. Reset active scenario means delay 0, baseline source parameters, no active recovery edits/alternatives/selection, and a newly identified incident record; recompute baseline-aligned timings. Confirm whenever draft or applied values would be discarded. Preserve the captured baseline and historical source records. Reset demo separately restores a fresh fictional seed, its preconfigured incident and its two alternatives without touching user workspaces. New blueprint revisions retain old snapshots; scenarios remain pinned and may be inspected/recalculated only with their own known snapshot. Mismatched revisions require explicit recreation/rebase. Selection changes only option status/application selection and never approvalStatus or baseline.

## Persistence and brief boundaries

Store source envelopes locally in the current browser and communicate that storage scope. Validate schema and all references on restore. Recompute current results. A saved DecisionBrief is a historic snapshot, marked hypothetical and tied to its baseline revision; label it stale relative to current work if applicable. Brief copy/print retains event, incident, three timing perspectives, recovered time, costs, affected activities, all warnings, assumptions, required approvals and user-supplied next actions. Do not infer authorization from a preferred alternative.

No public sharing endpoint or authentication is part of this handoff. No imported artifact establishes competition eligibility. Figma was inspected read-only for this freeze. No design node, text or style was modified.

## Test strategy and fixture protocol

GOLDEN_TEST_FIXTURES is JSON, not executable test code. `cases[].request` is a complete EngineRequest; no implicit seed merge or clock dependency. Successful expectations compare the exact documented projection of ScenarioResult; errors compare exact `(code,path,entityId,relatedIds)` arrays. Timing tuples are `[startMinute, finishMinute]`. Omitted result fields are not asserted by the fixture and require the matrix's dedicated tests. This avoids pretending a partial projection is a full result oracle.

Implement a fixture adapter that computes results and extracts the projection specified in `assertionContract`. For causal assertions compare `bindingDependencyIds` and `bindingEarliestStart` for the named activities; dedicated causality tests inspect all edges, ties, earlier-start relaxation and truncation. Do not generate expected output with the production engine under test. ComparisonGroups references fixture cases whose baseline and incident must be deeply identical. Expected alternatives are asserted by option ID, never by presentation position.

Add property tests for permutation invariance, no input mutation, finish=start+duration, every predecessor finish+lag <= successor start, stable repeated outputs, and monotonicity under increasing start/duration with fixed graph. Add seeded generated DAGs with independent brute-force/reference calculations where practical. Test error boundaries and saved-data corruption through integration. Assert fixed warnings and provenance; test brief consistency by matching its snapshots with recomputation.

Measure a deterministic 50-activity DAG with branches/joins after warm-up (for example 100 warm-up, 1,000 measured runs, p50/p95/max, browser/OS/CPU recorded). Separate engine time from rendering and local storage. Under 200 ms is a target requiring evidence, not a claim in this package. Future E2E and accessibility tests remain required even though preparation contains no rendered components.

## Preparation review gate

PASS: scope boundaries; changes are limited to engineering documents/fixtures and a freeze report inside the authorized directory; no application or Figma edits.

PASS: sourced claims; requirement IDs trace to local PRD v1.0 and all Q01–Q17 decisions are resolved and authorized schema amendments are explicit.

PASS: no visual assets, layouts or interactive controls are created; UI-specific antislop gates do not apply to this documentation-only work.

PASS: declaration consistency; TypeScript declarations and all typed engine-fixture requests are checked together under strict TypeScript settings using an in-memory compiler source; see the freeze report for current evidence.

PASS: fixture arithmetic; an independent recursive calculation checks successful fixtures and comparison projections. Invalid-input expectations, parser/brief cases and all browser behavior are specifications awaiting the implemented APIs. The freeze report records exact current validation counts.

PASS: traceability; all 55 PRD section 5 acceptance IDs occur as matrix rows, with additional engineering and Figma reconciliation checks; the freeze report records the current count. These preparation checks do not certify a future engine implementation or the 200 ms performance target.

## Figma integration contract freeze

Canonical data and exact node references are in CONTRACT_FREEZE_REPORT. Keep the visual direction, responsive behavior and native components; bind data from GOLDEN_TEST_FIXTURES.canonicalDemo rather than copying old artboard date/zone/currency text. The canonical demo has two pending, unknown-cost alternatives and no initial preference. A preferred-A brief is a subsequent example state after explicit selection; no third alternative is automatically added. Historical known-cost regression fixtures are not the demo seed.

Use `costMinorUnits: null` and `recoveryCostMinorUnits: null` for Not entered. Both schedule calculation and comparison/selection/brief remain available when the rest of the input is valid. Preserve COST_NOT_ENTERED through copy/print; never use fallback zero or show unknown as a monetary number. Currency must still be known and shared across compared options. Invalid cost text stays a dirty/invalid form and blocks that option's Apply. Draft status is an unselected valid proposal, independent from cost completeness and approval.

Display downstream existence from incidentDescendantIds.length; display downstream shifted from intersecting that set with shiftedActivityIds; use downstreamAffectedActivityIds only for the narrower incident-causal classification. Never equate no incident propagation with no total schedule shifts. Measure critical milestone finish, even when the main zero-duration Doors example makes start equal finish.

Selection is idempotent, exactly one preferred option, never approval. Application status recording needs supplied external context, while optional approver/condition metadata lets the interface state exactly what remains pending. Unknown cost and pending status survive the immutable report, which includes source/results for alternative B if mentioned. Copy reports success only after clipboard resolution; failure retains selectable text and retry. Browser print expands the full report and retains all warnings, and never claims physical print completion. No public sharing service.

An empty options collection is rendered from application state; calculate baseline/incident separately, do not fabricate an alternative or call a one-to-three comparison with zero options. Invalid options get error rows, not Feasible labels. A model-valid option remains hypothetical; physical feasibility and safety are not engine outputs. Presentation toggles and graph pan/zoom never change source or scheduling.
