# Deterministic scheduling engine specification

Source: PRD v1.0 sections 6–7. Contract status: frozen `freeze-1`; adopted decisions in OPEN_QUESTIONS apply. Time is elapsed integer minutes, not wall-clock text.

## Validation and ordering

1. Validate request shape, numeric limits, metadata, IDs, versions, same-event references and currency. Collect independent shape/reference errors in `(path, code, entityId)` ordinal order. Do not traverse invalid references.
2. Validate graph with Kahn's algorithm. Use an ordinal-ID min-heap for currently zero-indegree activities; sort adjacency by dependency ID. Pop, emit, decrement each successor indegree, and enqueue newly ready nodes. Multiple edges between the same pair are rejected before this step. If emitted count differs from node count return `CYCLE`, no schedule. A DFS over unresolved nodes in ID order supplies an actual cycle witness ending at its first node; unresolved downstream nodes are not all labeled cycle members.
3. Snapshot inputs by immutable value. Schedule baseline before applying scenario changes. No baseline mutation, including nested values, is permitted.
4. Apply incident, then recovery on a distinct effective activity map. Validate the complete effective map before scheduling. Failure returns errors and no partial result.

Frozen default limits: 500 activities, 5,000 dependencies, 100 milestones, 1,000 modifications per option, 10,080 minutes, 2,000 explanation edges per activity. The 50-activity performance target is tested separately; these are input bounds, not performance guarantees. Reject over-limit requests instead of silently truncating schedules.

## Scheduling recurrence

For each activity i in canonical topological order:

```
candidate(j,i) = finish(j) + lag(j,i)
start(i) = max(effectiveEarliestStart(i), all predecessor candidates)
finish(i) = start(i) + effectiveDuration(i)
```

With no predecessors, start is effectiveEarliestStart. Use maximum, never sum, across predecessors. Independent branches share no resources in this MVP. Nonnegative finish-to-start lag is a minimum waiting interval; it is not a resource reservation. Duration zero yields start == finish. Earliest start is a lower bound, not a pinned scheduled time. A deadline is diagnostic and never pushes or clamps the schedule. Equality with deadline is on time. Negative lag, overlap dependencies, calendar shifts, resource capacity and automatic optimization are excluded.

Validate each addition for safe-integer overflow and horizon overflow before using it. Same baseline and scenario graph order applies because recovery changes only earliest-start or duration values.

## Incident and recovery semantics

**Adopted incident anchor:** let B be the calculated baseline. For incident target t and delay d, set effectiveEarliestStart(t) to `B.start(t) + d`. All other activity values initially equal baseline source values. This makes a reported vendor delay relative to the planned feasible start, including when predecessor constraints originally bound the task. At d=0 the baseline schedule is reproduced. An incident does not directly change duration.

Each recovery starts from a fresh copy of that same unmitigated incident's effective input. For each unique `(activityId, field)`, `set` assigns the value and `add` adds to the incident-effective field. No array-order dependence: duplicate field targets are rejected. Independent modifications commute. Negative adds may recover time but must leave valid final fields. A `set` on the incident target may supersede its delayed earliest-start constraint; present this as an explicit assumption that vendor readiness changes, never as an observed fact. Baseline graph and deadlines never change under recovery.

Protected duration is compared with baseline duration, so `set` and `add` cannot bypass protection. Shortening a protected task returns `PROTECTED_DURATION`; no output is produced for that option. Other valid options still calculate independently. Modifying an approval-required task with `not_required` returns `APPROVAL_REQUIRED`. Pending options are predictions with `APPROVAL_PENDING`, not authorized actions. Confirmation is user-supplied metadata and is never inferred by the engine. Entered costs are user-supplied nonnegative safe integers; null means Not entered. Null cost does not block valid timing, comparison, selection or brief creation, but adds COST_NOT_ENTERED. Never substitute zero or calculate monetary totals/rankings from unknown estimates. No price or staffing inference.

## Differences, deadlines and comparisons

For each activity, emit signed start/finish deltas from B. Shifted means either delta is nonzero; duration-only finish changes count. IncidentDescendantIds is the full set reachable from the incident target, excluding the target. DownstreamAffectedActivityIds is the subset of descendants with a shifted start caused by changed binding predecessor candidates (see explanation rules); mere reachability or a direct duration edit does not prove propagation. Retain descendants even if slack absorbs the change.

For each critical milestone m referencing activity a:

```
delayFromBaseline = scenario.finish(a) - B.finish(a)       // signed
breach = max(0, scenario.finish(a) - m.deadlineMinute)
baselineBreach = max(0, B.finish(a) - m.deadlineMinute)
breachDelta = breach - baselineBreach                    // signed
recovered = incident.finish(a) - recovery.finish(a)       // signed
```

Recovered is null for baseline and incident rows. Negative recovered time exposes a worse alternative. A recovery earlier than baseline may recover more than the incident's positive delay; do not clamp. AffectedMilestones includes nonzero delayFromBaseline; DeadlineBreaches includes positive breach, even if baseline was already late. Baseline deadline breach yields a warning. Emit all milestoneImpacts, including unchanged ones. Never sum milestone delays across milestones or choose a hidden primary milestone. Comparison shows one metric row per milestone and each option's shifted count, cost, approvals, assumptions and warnings. No ranking as optimal or safest. At most three alternatives in one comparison; reject four rather than silently drop one.

## Causal explanations

Emit one explanation record per activity, including unchanged tasks. Store binding predecessor edges where `finish(pred) + lag == start(i)` and separately whether earliestStart also equals start. Include all ties and baselineBindingDependencyIds. A direct earliest-start or duration source change is recorded independently by startChangedDirectly/durationChangedDirectly, even if a bound masks its timing effect. To build an explanation for a shifted activity, walk backward through binding edges in the scenario; emit real dependency IDs and numeric candidates. Include only ancestor chains, never arbitrary graph reachability. Sort edges by `(constraintContext, dependencyId)`; a shared prefix is stored once as a compact causal DAG, not exponentially many complete paths. `explanationPaths` is the PRD-compatible field name for these compact records. constraintContext identifies whether edge numeric values came from the baseline or scenario calculation.

To classify propagated start changes, also compare each binding scenario candidate with its baseline counterpart. At least one must have changed and exceed the baseline start for a later start (or the baseline binding predecessor must have relaxed for an earlier start). Then require a chain of such changed predecessor constraints back to the incident target or another direct recovery edit. For earlier starts, consult both baseline and scenario binding edges; otherwise a formerly binding edge that ceased to bind would disappear from the explanation. Mark an incident downstream effect only if that causal chain reaches a residual incident constraint: delay > 0, the incident target's effective earliest start remains greater than its baseline start, and that constraint binds its scenario start. A recovery edit alone on an incident descendant is not incident propagation. A zero-delay incident with a recovery duration edit on its target also has no incident-caused downstream effects, even though descendants can shift. Ties may expose both incident and recovery causes. This explicit attribution policy is adopted under Q09; it is not a general counterfactual attribution model.

Earliest-start slack blocks a start change when the changed predecessor candidate remains at or below the existing lower bound. Explain the unchanged task's binding lower bound when inspected; no invented claim that every reachable task shifted. A duration-only edit can alter its own finish while its start remains unchanged; downstream causal chains can then begin at that edited duration.

For an implementable provenance rule, maintain startCauseKinds and finishCauseKinds as sets in topological order, serialized ordinally. If start is unchanged its start-cause set is empty. If start increased, union finish causes from scenario-binding predecessors whose candidate exceeds baseline start. Add incident at the target only for the residual binding constraint defined above; add recovery when a changed earliest-start recovery field binds the increased start. If start decreased, union finish causes from baseline-binding predecessors whose candidates decreased, and add recovery for a reduced baseline-binding earliest-start field. Finish causes are the union of start causes and recovery when a direct duration edit changes duration; clear the set if finish is unchanged. These are contributors to changed constraints, not claims of exclusive or sufficient causation. DownstreamAffectedActivityIds is exactly incident descendants with nonzero start delta and incident in startCauseKinds. Thus changed recovery-only branches remain explainable without mislabeling them as incident impact. Full classification runs before explanation output truncation.

Keep explanatory traversal bounded: at most maxCauseEdges unique edges per activity, sorted deterministic selection; set truncated=true and EXPLANATION_TRUNCATED if exceeded. This limit must never change timing or affected-task classification, which is computed separately with complete graph data. Results describe dependency constraints, never full critical-path analysis or physical safety certification.

## Canonical output and complexity

Output activity arrays in activity ID order, milestone arrays in milestone ID order, warnings by `(code, entityId, message)`, errors by `(path, code, entityId)`; topologicalOrder retains heap order. Scenario IDs are supplied by callers. Never add runtime timestamps or random IDs to results. Repeated normalized input yields structurally and canonically identical output, including explanations and errors. `engineVersion: '1'` identifies these semantics.

Graph timing and validation are O((V+E) log V) with heap ordering, O(V+E) memory; explanations cost at most O(V*(V+E)) when constructed for all activities, with bounded output. Compute binding-cause sets via memoization rather than enumerating all paths. Do not claim a performance target met until measured on named hardware against a published 50-activity fixture.

## PRD demonstration arithmetic

Reference 08:00; all lags zero. Baseline offsets: Power 0–120; Audio/Lighting 120–240; Testing 300–360; Rehearsal 360–480; Doors 540–540. Deadline 540. Power delay 240 yields 240–360, branches 360–480, Testing 480–540, Rehearsal 540–660, Doors 660–660. Breach = 660–540 = 120. Testing absorbs 60 minutes before propagation and Doors' baseline lower bound absorbs another 60. No extra lag is needed.
