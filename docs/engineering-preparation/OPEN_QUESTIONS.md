# Resolved decision register and residual uncertainty

Contract revision: `freeze-1`, frozen 2026-10-15 by the user's Design & Engineering Contract Freeze instruction. This file retains its existing name for stable links. Q01–Q17 are resolved MVP decisions, not pending approvals. PRD v1.0 remains the product specification; the user's freeze instruction authorizes the explicit schema/interaction clarifications below. The PRD itself is preserved.

The deterministic example is internally consistent: zero dependency lag yields Doors Open 19:00 and a 120-minute breach. One hour before Testing and one hour before Doors absorb two hours. Do not add dependency lags to encode those gaps. The main logical-schema omission was the event reference instant. The Figma audit additionally found nullable-cost, metadata, reset, version-retention and wording mismatches; see [CONTRACT_FREEZE_REPORT.md](CONTRACT_FREEZE_REPORT.md).

| ID | Frozen decision | Status / rationale |
|---|---|---|
| Q01 | Add minute-aligned UTC referenceInstant; keep local event date and IANA timezone separately. Production can start on a prior date. | Adopted. Resolves F02 vs section 6 schema omission. |
| Q02 | Incident earliest start = calculated baseline target start + delay, never previous scenario result or raw source lower bound. | Adopted. Existing incident-calculated-start-anchor fixture proves the distinction for a dependency-bound task. Figma wording must reconcile. |
| Q03 | Incident schema remains start-only. Isolated duration exploration uses a recovery modification against a zero-delay incident. | Adopted. No new incident union or feature. |
| Q04 | One modification per activity/field; add/set operates on fresh incident-effective input. Set may replace the delayed target constraint. | Adopted. Changing arrival remains an explicit hypothetical assumption. |
| Q05 | Reject protected duration shortening versus baseline; equal duration, extension and valid earliest-start edits are allowed. | Adopted. No blanket ban on all protected-task mutations. |
| Q06 | Approval-required activity edits need pending/confirmed. Pending can calculate/select/export conditionally. Selection never confirms approval. | Adopted. Approvers/conditions/context are records; work authorization remains external. |
| Q07 | Default bounds: 0–10,080 minutes, 500 activities, 5,000 edges, 100 milestones, 1,000 modifications/option, 2,000 cause edges/activity. | Adopted. Request carries limits; no negative source offsets. Text caps are frozen in DOMAIN_MODEL. |
| Q08 | Report every critical milestone independently using referenced activity finish; no hidden primary or summed delay. | Confirmed. Nonzero-duration referenced activities are valid. |
| Q09 | Separate reachability, any start/finish shift, and changed-start incident constraint provenance. Apply complete classification before bounded explanations. | Adopted. Figma's downstream-shift count is reachability intersect shifted IDs; it is not always the incident-provenance count. |
| Q10 | Recovered time = unmitigated finish minus recovery finish, signed and unclamped. | Confirmed. Negative means worse; earlier-than-baseline recovery can exceed positive incident delay. |
| Q11 | Offline allowlist of ISO currencies/exponents; request-wide currency; no FX. Initial catalog USD/GBP/EUR/IDR=2, JPY=0. | Confirmed. Unsupported codes rejected, including with unknown amount. Canonical demo currency stays USD. |
| Q12 | Deletion authors a new revision atomically, removes edges and requires explicit milestone reconciliation. Old pinned revisions/briefs remain intact. | Confirmed with revision boundary clarified. Never cascade-delete historical scenarios to implement a current edit. |
| Q13 | Versioned browser-local envelope with separate demo/workspace namespaces, retained immutable baseline snapshots and safe restore. | Confirmed. Same browser profile can share local data; no cross-person isolation claim. |
| Q14 | Copy/print only; browser print may save PDF. No public sharing endpoint or PDF service. | Confirmed. Copy success only after clipboard resolution; print invocation is not physical success. |
| Q15 | Persisted drafts may have no activities/milestones; runnable baseline requires at least one activity and critical milestone. | Confirmed. Event identity remains validated; incomplete identity stays form state. |
| Q16 | Bounded, real causal constraint DAG with all binding ties; truncation does not affect timings/classification. No unsupported critical-path claim. | Confirmed. Graph/list are presentations of the same typed results. |
| Q17 | UTC reference + explicit event IANA zone; adapter resolves local input and rejects ambiguous/nonexistent times without explicit resolution. | Confirmed. No browser-local implicit timezone parsing. |

## Additional freeze decisions from reconciliation

| ID | Decision | Reason / traceability |
|---|---|---|
| C01 | RecoveryOption.costMinorUnits and result recoveryCostMinorUnits are number or null. Null is valid unknown with COST_NOT_ENTERED; zero must be entered explicitly. | Figma R03/R06 and F04 optional cost contradict numeric-only logical fields. Scheduling, comparison, selection and brief remain eligible. |
| C02 | Preserve every original golden request and expectation exactly. Append explicit Figma A/B, +60 slack and cost cases; two demo alternatives, no automatic third. | Original earlier-vendor regression is confirmed/known cost; original combined option shortens Rehearsal. Neither may be silently substituted for Figma's pending/unknown-cost A/B. |
| C03 | Canonical event date 2026-10-15, zone Asia/Jakarta, reference 2026-10-15T01:00:00Z; zero-lag sample and USD denomination unchanged. | User freeze instruction and existing canonical source. Figma 22 Oct/Europe-London/GBP copy is data to reconcile during Bolt implementation. |
| C04 | Add optional source approvalRequirements and approvalContext, normalized in results. Require supplied context when an application command records new confirmed status. | Enables distinct vendor vs technical director/supplier conditions without an approval workflow. Legacy fixtures remain valid. |
| C05 | Retain baselineVersions keyed by opaque revision plus currentBaselineVersion. Known older scenarios can calculate only with their own snapshot; mismatched revisions fail. | Figma promises scenarios pinned to v1. A current-baseline-only envelope could not honor that promise. |
| C06 | Explicit Apply commits form drafts. Any edit marks current results out of date and blocks compare/brief. Scenario reset sets delay 0, clears recovery drafts/options/selection and recomputes baseline-aligned output. | Figma R03 vs ambiguous engineering “restore initial” wording; demo reset remains a separate operation. Incident edit/reset creates a new incident ID so old options/briefs remain pinned to old content. |
| C07 | Comparison opens without preference; selecting one valid option is explicit/idempotent. Brief freezes all mentioned alternative source/results as well as selected result. | Supports no-preference frame and the brief's Option B summary without invented or live-linked data. |
| C08 | “Downstream shifted” = intersection of incidentDescendantIds and shiftedActivityIds. “Incident-caused downstream” uses downstreamAffectedActivityIds. No-incident-impact does not imply zero total shifted. | Counterexample: zero-delay incident plus recovery duration extension shifts tasks without incident provenance; existing duration-only fixture preserves this distinction. |

## Residual uncertainty and blockers

No unresolved domain decision blocks starting the Bolt implementation. Remaining work is execution and verification, not a missing product contract:

- Figma still contains old sample metadata and some contradictory instructional wording. The report supplies the exact implementation precedence and data-only correction list; this turn performs no Figma edits.
- Figma prototype reaction inspection returned zero wired reaction nodes. These are static interaction specifications, not runtime evidence. Implement transitions and their accessibility tests in Bolt.
- Storage durability, browser support, multi-tab handling, IANA conversion behavior on target browsers and the <200 ms target require implemented adapter/browser tests. No runtime guarantees are asserted.
- The repository ignores docs. Apply the minimal documented ignore change and deliberately include the files before the eventual Git-based handoff. No ignore edit, staging, commit or push is authorized/performed here.
- Competition rules and commercial validation remain outside this technical freeze. No eligibility or traction claim is made.

Recommendation: **READY for Bolt implementation using freeze-1**, with the discrepancy report as an implementation input. This is not production/release readiness.
