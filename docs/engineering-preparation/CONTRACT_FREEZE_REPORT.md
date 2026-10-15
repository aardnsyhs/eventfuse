# Design and engineering contract freeze report

Revision `freeze-1`, 2026-10-15. Recommendation: **READY for Bolt implementation** using this package and the data/wording corrections below. This is specification readiness, not a release, runtime, accessibility or performance certification.

Authority: PRD v1.0 plus the user's explicit Design & Engineering Contract Freeze instruction. [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md) resolves Q01–Q17 and records C01–C08. PRD content is preserved; the authorized changes amend its logical schemas and interaction interpretation rather than silently rewriting it. The main PRD timing example is consistent.

## Figma evidence and scope

Inspected [EventFuse design](https://www.figma.com/design/dJytvLMR5sdBXH9876y3PP), Page 1 `0:1`, using read-only Figma Plugin API queries. Inventoried top-level roots, desktop/mobile supporting frames, handoff text, Section 08 refinements, and prototype reaction coverage. Key current references:

| Source | Node | Audit use |
|---|---|---|
| R02 activity/dependency contract | [6:31518](https://www.figma.com/design/dJytvLMR5sdBXH9876y3PP?node-id=6-31518) | Draft/save/revision/deletion and validation |
| R03 scenario-to-decision contract | [6:31604](https://www.figma.com/design/dJytvLMR5sdBXH9876y3PP?node-id=6-31604) | Explicit Apply, zero reset, selection, null cost, external approvals, frozen export |
| R05 implementation contract | [6:31879](https://www.figma.com/design/dJytvLMR5sdBXH9876y3PP?node-id=6-31879) | Pure scheduler, form states, browser test obligations |
| R06 fixture/readiness contract | [6:32017](https://www.figma.com/design/dJytvLMR5sdBXH9876y3PP?node-id=6-32017) | Exact A/B tables and conditional status |
| Desktop compare / brief | `4:29943` / `4:30089` | Known reference time, A/B conditions, unknown cost and export contents |
| Mobile compare / brief | `4:31183` / `4:31328` | Current summaries and retained warnings |
| Mobile no-preference state | `6:18498` | No automatic selection on entering compare |
| Desktop +60 slack | `4:30617` | Three shifts, two shifted descendants, no breach |

Older standalone H-R01–04 boards were also read. When their wording differs from Section 08, use Section 08 for interaction intent and this freeze for domain arithmetic/data. Design properties and visual direction remain owned by Figma. No Figma text, styling, component, layout or reaction was written. No screenshot-based visual/a11y audit is claimed. Page-wide reaction inspection found **zero nodes with nonempty prototype reactions**: interaction text and artboards are specifications, not working controls.

## Discrepancy and resolution table

Severity: High can create wrong results, invented facts or unusable state; Medium can cause mapping, persistence or handoff defects. “Reconcile in Bolt” means bind corrected data/semantics during the future build; the Figma artifact itself remains unchanged.

| ID / severity | Evidence / discrepancy | Resolution and traceability | Status |
|---|---|---|---|
| D01 High | Figma R03/R06 and compare show null/Not entered; domain/API/PRD logical cost fields numeric-only. | C01: nullable source/result cost; mandatory supported currency; COST_NOT_ENTERED; valid timing/compare/select/brief; no default 0. Update domain, API, simulation, fixtures, matrix, architecture and handoff. | Contract resolved; implementation pending. |
| D02 High | Figma `6:31624` and `4:30651` say add to baseline earliest permitted start; adopted Q02 anchors calculated feasible start. | Counterexample already in incident-calculated-start-anchor: Audio source bound 0, baseline actual start120; delay60 must start180, not120. Q02 governs. Change instructional wording to calculated baseline start. | Reconcile wording in Bolt; no engine ambiguity. |
| D03 Medium | Figma date22 Oct2026/Europe-London differs from canonical15 Oct/Asia-Jakarta. | C03: use canonical source metadata and reference01:00Z =08:00 local. Preserve local clock fixture times rather than timezone-convert London's old sample instants. | Data-only reconciliation in Bolt. |
| D04 Medium | Figma GBP selection vs existing fixture request currency USD. | Keep canonical USD denomination; both A/B amounts null. No FX or converted amount. GBP remains supported for user-created inputs. | Data-only reconciliation in Bolt. |
| D05 High | Existing earlier-vendor fixture has known cost/confirmed status; combined fixture also shortens Rehearsal. Figma A/B both pending/null, B changes only Audio/Lighting. | C02: preserve original 21 cases and original comparison exactly; append separate canonical A/B fixtures and two-option comparison. Never seed regressions as demo alternatives. | Resolved by appended fixtures. |
| D06 Medium | Figma shows vendor vs technical director/supplier conditions; old RecoveryOption has only aggregate status and generic notes. | C04: optional approvalRequirements/context on source, normalized result fields, captured in brief. No new workflow or evidence upload. Aggregate status never inferred. | Contract resolved. |
| D07 High | Figma retains scenarios on v1; original single-baseline envelope and forced rebase wording cannot honor that. | C05/Q12/Q13: retained baselineVersions and current pointer; revision-scoped deletion; historical scenarios use captured source, mismatches fail. | Contract/storage specification resolved. |
| D08 High | Engineering “restore initial” could restore +240; Figma R03/R06 reset means zero. | C06: active reset creates zero-delay incident, clears active recovery/options/selection, retains baseline/history; demo reset separately restores the seeded examples. | Contract, handoff and matrix resolved. |
| D09 High | Figma dirty/validating states and explicit Apply absent from engineering calculation state union. | Add dirty/validating, currentness token and explicit commit transition. Disable compare/brief until valid Apply. Historical display never masquerades as current. | Contract/handoff/matrix resolved. |
| D10 Medium | Preferred-A artboards might imply automatic selection; no-preference frame/R03 specify none on entry. | C07: initial preferred ID null, explicit idempotent selection. Only selected valid option can produce brief. | Fixtures and handoff resolved. |
| D11 High | Figma “0 downstream / 0 shifted” shorthand can conflate causal impact with shifts. | C08: display descendant count, descendant-intersect-shifted count and incident-causal count separately. Existing duration-only fixture gives 3 total shifts,2 shifted descendants,0 incident-caused descendants. | Mapping resolved; shorthand must not be hardcoded. |
| D12 Medium | Brief mentions alternative B but old DecisionBrief captures only selected output. | C07: comparisonOptionSnapshots and successful comparisonResultSnapshots freeze alternatives too; exported alternative claims use those snapshots and retain warnings. | Domain/API/brief fixture resolved. |
| D13 High | “Approved parallel setup compression” in `4:30026`, `4:29528`, `4:30863` contradicts pending status. | Use “Parallel setup compression” / conditional, pending. Do not change enum to approved or infer authority. | Wording reconciliation in Bolt. |
| D14 Medium | Figma logical aliases: referenceStart, deadline, baselineVersionId, recordedStatus vs frozen types. | Use mapping below; no parallel incompatible schemas. Breach uses referenced finish, not general start, even if Doors is zero-duration. | Mapping resolved. |
| D15 Medium | Figma R06 “Rehearsal120 always” could incorrectly prohibit correct regression recovery shortening. | Interpret as fixed in these canonical A/B examples only. Rehearsal remains classification normal; only Testing is protected. Q05 applies to protected duration. | Scope wording resolved; original fixtures unchanged. |
| D16 Medium | No alternatives and physical infeasibility states lack engine enum counterparts. | Empty is application collection state; calculate baseline/incident separately. Invalid option uses Result failure. Valid model is hypothetical/conditional, never proof of physical feasibility. | API/handoff resolved. |
| D17 High | Read/check/write localStorage alone cannot guarantee no cross-tab race. | Same-key browser lock + in-lock revision check; session-only unsaved fallback if lock unavailable. No atomicity claim from a revision check alone. | Architecture/matrix resolved; browser verification pending. |
| D18 Medium | `.gitignore` ignores entire docs tree, including PRD and all preparation. | Minimal allowlist change below; no staging/commit/push or ignore edit in this turn. | Recommendation supplied; Git-based handoff action outstanding. |

## Canonical demo and preserved expectations

Use GOLDEN_TEST_FIXTURES.canonicalDemo and comparison group `canonical-figma-two-alternatives` as the seed manifest. All 21 original case objects and the original three-alternative comparison remain unchanged; their known estimates/confirmed statuses are regression inputs only. The initial demo uses exactly two alternatives with no preference, both pending with null cost in USD. Preparing the preferred-A example brief requires explicit selection.

Event: 2026-10-15; Asia/Jakarta; reference `2026-10-15T01:00:00Z` (08:00); deadline Doors minute540 (17:00). Incident Power+240 minutes. All dependencies finish-to-start, lag0. Owner/name strings remain fictional canonical input; the following labels map to the same stable IDs.

| Activity ID / approved display label | Baseline | Incident | Conditional A | Conditional B |
|---|---|---|---|---|
| power / Power Installation | 08:00–10:00 | 12:00–14:00 | 10:00–12:00 | 12:00–14:00 |
| audio / Audio Setup | 10:00–12:00 | 14:00–16:00 | 12:00–14:00 | 14:00–15:00 |
| lighting / Lighting Setup | 10:00–12:00 | 14:00–16:00 | 12:00–14:00 | 14:00–15:00 |
| testing / System Testing | 13:00–14:00 | 16:00–17:00 | 14:00–15:00 | 15:00–16:00 |
| rehearsal / Full Rehearsal | 14:00–16:00 | 17:00–19:00 | 15:00–17:00 | 16:00–18:00 |
| doors / Doors Open | 17:00 | 19:00 | 17:00 | 18:00 |
| Deadline breach, minutes | 0 | 120 | 0 | 60 |
| Recovered vs incident, minutes | n/a | n/a | 120 | 60 |
| Shifted activities incl. milestone | 0 | 6 | 5 | 6 |
| Shifted descendants of Power | n/a | 5 of 5 | 4 of 5 | 5 of 5 |
| Additional intervention cost | 0 (none modeled) | 0 (none modeled) | Not entered (null USD) | Not entered (null USD) |

A sets Power earliest_start to120, replacing incident240, subject to vendor confirmation. B sets Audio/Lighting durations to60 each, subject to technical director/supplier confirmation. Both retain protected Testing60 and Rehearsal120. All reported milestones use finish times; deadline breaches and recovered times are distinct metrics.

Additional `figma-power-plus-60-slack` fixture: Power09–11; Audio/Lighting11–13; Testing13–14; Rehearsal14–16; Doors17. Exactly3 shifts,2 of5 descendants shifted,0 breach. Original +30 slack fixture remains unchanged. Active reset uses zero-delay-incident, not +240; full demo reset reloads this manifest.

## Data-only reconciliation targets

Apply these bindings in Bolt rather than treating copied Figma text as authoritative. No restyling or independent redesign is requested.

- Date/zone headers and editor dates: desktop D01–D06 `4:29356`, `4:29543`, `4:29614`, `4:29783`, `4:29943`, `4:30089`; supporting `4:30181`, `4:30284`, `4:30386`, `4:30469`, `4:30617`; mobile M01–M06 `4:30781`, `4:30878`, `4:30942`, `4:31070`, `4:31183`, `4:31328`; mobile editor/create/zero/no-preference `6:2938`, `6:7692`, `6:7835`, `6:18498`.
- Narrow current mobile references `6:3422`, `6:3509`, `6:3596`, `6:3690`, `6:3784`, `6:3862` use the same corrected metadata. Standalone R-M copies `6:26458`–`6:28292` also contain old sample metadata; do not import their London date text as source.
- Cost currencies: desktop `4:29990`, `4:30045`; current mobile option detail text nodes `6:3023`, `6:3090`; standalone detail instances `I6:28161;4:32109`, `I6:28341;4:32109`. Bind USD for this demo; preserve Not entered.
- Manual/reference text: R02 `6:31541`, R06 `6:32027`, H-R04 `6:28902`, strategy `4:28819`, walkthrough `4:31441` and date/zone form state `4:31517`. Event timezone remains configurable; DST validation is generic, not a London default.
- Delay anchor wording `6:31624` / `4:30651` must mean calculated baseline start. Option B “Approved” labels `4:30026`, `4:29528`, `4:30863` must remain conditional/pending.
- Older storage alias text `4:31883`, `6:28692` must map to the frozen envelope below. Retain the existing local-storage disclosure and warnings.

These references identify inspected text, not completed design edits. Recheck against Figma if the file changes after this audit.

## Field and enum mapping

| Figma term | Frozen source/result contract |
|---|---|
| referenceStart / production reference | Event.referenceInstant (UTC ISO instant); timezone/date separate |
| baselineVersionId / BaselineVersion.id | BaselineSnapshot.baselineVersion; Incident.baselineVersion |
| earliestStartMinutes / earliestAllowed | Activity.earliestStartMinute |
| duration / milestone | durationMinutes / isMilestone; zero duration when isMilestone |
| targetId / delayMinutes | Incident.targetActivityId / startDelayMinutes |
| cost.amountMinor / cost.currency | RecoveryOption.costMinorUnits (number or null) / currency |
| deadline / Doors target | CriticalMilestone.deadlineMinute; never mutate activity start to enforce deadline |
| recordedStatus / Pending | approvalStatus: not_required, pending, confirmed; no approved enum |
| preferred / selected | status: draft or selected; draft means valid unselected proposal |
| normal / approval required / protected | classification: normal, approval_required, protected |
| no effect / breach / cost unknown | Derived presentation states/metrics/warnings, not Activity classification |
| frozenAt / frozenSnapshot | DecisionBrief.createdAt / typed event, incident, options and result snapshots |

## Minimal Git tracking recommendation

Current `git check-ignore` confirms the final `docs` rule excludes both PRD and preparation. Replacing that one rule with the following keeps other documentation excluded and exposes only the specification/handoff subtree:

```diff
 # Docs
-docs
+/docs/*
+!/docs/PRD.md
+!/docs/engineering-preparation/
```

An exception for the child alone cannot traverse an ignored parent directory. Include PRD because the preparation's authoritative relative reference otherwise disappears from a Git-based handoff. This recommendation changes no application source and does not unignore every document. An eventual explicit Git handoff must deliberately include these files after the ignore change; no staging/commit/push is performed here. Direct filesystem handoff is possible now. Validate with `git check-ignore -v` and `git status --short --untracked-files=all` after the owner authorizes/applies the change.

## Verification and readiness boundary

The final preparation verification checks TypeScript declarations and fixture shapes, original-case preservation, independent scheduling arithmetic, exact cost-parser expected arithmetic, all 55 PRD acceptance row mappings, relative links and unchanged unrelated-file hashes. Cost/parser/brief fixture schemas are reviewed specifications; there is no production engine, parser, brief builder, UI or adapter implementation in this package. Invalid-input expectations are not executed validator tests. Browser accessibility, persistence/concurrency, clipboard/print and <200ms performance remain future implementation tests.

No remaining domain blocker prevents starting Bolt. Outstanding delivery/release actions are: reconcile the listed data/wording when binding Figma, deliberately include the ignored documentation before Git-based transfer, implement the contracts, and execute the specified runtime tests. Do not describe this freeze as runtime-tested or production-ready. No application, visual design, Figma mutation, deployment, auth, payment or AI feature was added.

Preparation validation completed for freeze-1:

- PASS: strict TypeScript declaration and input-shape checking (29 engine requests, 16 cost drafts, 1 brief metadata object) using an in-memory source, no application module created.
- PASS: all 21 original case objects and the original comparison group preserved; 25 unrelated tracked/PRD/ignore file hashes unchanged.
- PASS: independent arithmetic for 20 valid schedules, milestone metrics, shifts, descendant/provenance classification, asserted binding constraints and 5 alternative metrics across 2 comparison groups.
- PASS: independent decimal/grammar review of 16 cost-parser expected cases; this does not execute a future production parser.
- PASS: all 55 PRD acceptance criteria retain unique matrix rows, plus 45 engineering/state/cost/Figma checks; relative document links resolve.
- PASS: proposed Git allowlist checked in an isolated temporary repository for PRD, both preparation paths and an unrelated document; intended paths become visible while unrelated docs remain ignored. Temporary files were removed, and the actual repository ignore policy/index were unchanged.
- Scope: 9 final files, comprising the original eight updated documents/fixtures and this report. No Figma mutation, application implementation, Git index change or ignore-policy edit.

Nine invalid engine requests and one brief case specify expected behavior for future API tests. They have not passed runtime tests against an implemented engine or brief builder. No browser, performance, storage or export runtime tests were run.
