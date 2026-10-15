# Acceptance test matrix

Source: PRD v1.0 plus authorized freeze-1 decisions and read-only Figma refinement audit (2026-10-15). Rows with AC IDs map one-to-one to all section 5 acceptance criteria. Additional rows cover section 6 integrity, section 7 minimum tests and section 9 nonfunctional requirements. This is a future test specification, not a report of application tests passing. UI-related rows specify observable behavior only and await the independent design implementation.

P0 is release-blocking MVP functionality/integrity. P1 covers PRD F07/F08 and supporting quality; critical integrity/privacy checks remain P0. `unit` is a pure function; `integration` spans commands/adapters/modules; `E2E` runs in a browser. Performance thresholds are measured targets, not current claims.

| Requirement ID | Test scenario / initial conditions | User/system action | Expected outcome | Priority | Class |
|---|---|---|---|---|---|
| AC-F01-01 | Clean browser profile; no account | Open demo entry | Fictional seed loads with no login or remote persistence | P0 | E2E |
| AC-F01-02 | Fresh demo seed | Inspect source fixture | Six meaningful activities including Doors Open; fictional disclosure present | P0 | integration |
| AC-F01-03 | Valid baseline and current incident | Commit a 240-minute Power delay | Timings recalculate to Doors 660; result token matches committed input | P0 | integration |
| AC-F01-04 | Edited demo source/options/selection | Confirm demo reset | Exact fresh seed restored; demo edits removed; user workspace untouched | P0 | integration |
| AC-F01-05 | Two clean browser profiles | Edit event in profile A; load B | B retains original seed; no cross-profile mutable state | P0 | E2E |
| AC-F01-06 | Demo loaded; external AI endpoints blocked | Run incident and comparison | All calculations complete without paid AI calls or keys | P0 | E2E |
| AC-F02-01 | Empty local workspace | Create valid event identity with no milestones, then complete schedule | Validated local draft persists; simulation blocked until at least one activity and critical milestone exist | P0 | integration |
| AC-F02-02 | Each required identity field omitted; valid draft lacks deadline | Validate draft, then attempt runnable calculation | Identity omissions fail; draft without milestone allowed; runnable input without deadline/activity fails | P0 | unit |
| AC-F02-03 | Blank name, impossible date, unknown zone | Validate each input | INVALID_TEXT/INVALID_DATE/INVALID_TIMEZONE with precise paths; no host-zone fallback | P0 | unit |
| AC-F02-04 | Valid event saved successfully | Refresh page | Same source revision and fields restored; current results recomputed | P0 | E2E |
| AC-F02-05 | Clean browser; no server storage | Create demo edits, save and refresh | Supported local mode works; server persistence unused | P0 | integration |
| AC-F03-01 | Runnable event | Create, edit, then delete an unreferenced activity | Each source command is atomic, validated, and creates a new baseline revision | P0 | integration |
| AC-F03-02 | Two activities in one event | Add valid finish-to-start edge | Successor start >= predecessor finish+lag | P0 | unit |
| AC-F03-03 | Activity power exists | Add power->power | SELF_DEPENDENCY; no graph commit | P0 | unit |
| AC-F03-04 | Demonstration DAG | Add doors->power | CYCLE with actual witness; no timings; fixture invalid-circular-dependency | P0 | unit |
| AC-F03-05 | Task referenced by current edges, incident, option and milestone | Delete in new revision after explicit milestone reconciliation | New revision has no dangling references; old baseline/scenarios/briefs retain captured source; active new-revision drafts/selection reconciled | P0 | integration |
| AC-F03-06 | Disconnected branch fixture | Delay Audio 30 minutes | Other branches retain exact baseline timings | P0 | unit |
| AC-F03-07 | Unequal predecessor finish fixture | Delay Power 240 minutes | Testing waits until Lighting finishes at 540, not Audio at 480 | P0 | unit |
| AC-F03-08 | Doors duration 0, earliest 540 | Calculate baseline | Doors start=finish=540; no arbitrary minimum duration | P0 | unit |
| AC-F03-09 | Computed baseline launch-v1 | Commit duration change to v2 | New current revision recalculates; v1 scenario stays pinned and labeled historical, never mixed with v2 | P0 | integration |
| AC-F04-01 | Current validated launch-v1 snapshot | Create incident scenario | Scenario references exact revision and isolated source values | P0 | integration |
| AC-F04-02 | Deep-frozen baseline and two options | Calculate first recovery | No baseline/incident/other-option object changed | P0 | unit |
| AC-F04-03 | Persisted baseline plus active scenario | Edit, reset, delete scenario in sequence | Baseline source and serialized persistence unchanged throughout | P0 | integration |
| AC-F04-04 | Minute/cost editing draft | Enter boundary, fractional and negative inputs | Units explicit; configured bounds enforced; invalid draft never committed | P0 | E2E |
| AC-F04-05 | Previously successful scenario | Enter invalid duration/reference | Current result becomes invalid; old success never presented as current | P0 | integration |
| AC-F04-06 | Active +240 incident, recovery edits and selection | Confirm Reset active scenario | New zero-delay incident; active recovery/options/selection cleared; Doors 540; old snapshots and baseline unchanged | P0 | integration |
| AC-F04-07 | Pending recovery with assumption notes | Calculate and inspect result | All input assumptions and operational disclaimer available verbatim | P0 | integration |
| AC-F05-01 | Same normalized inputs; shuffled entity arrays | Calculate repeatedly with stable IDs | Canonical outputs deeply identical; no timestamps/randomness | P0 | unit |
| AC-F05-02 | Engine imported in test runtime with no network/DOM | Calculate golden incident | Exact 660-minute milestone finish with no AI dependencies | P0 | unit |
| AC-F05-03 | Input activities in reverse dependency order | Calculate | Canonical topological order respects every edge | P0 | unit |
| AC-F05-04 | Independent branch fixture | Change Audio earliest start | Only that branch changes; no resource coupling | P0 | unit |
| AC-F05-05 | Testing with Audio+Lighting predecessors and positive lag | Calculate latest-finish and lag fixtures | Use max predecessor finish+lag, never sum; 540 and 330 respectively | P0 | unit |
| AC-F05-06 | Baseline already late and recovery earlier/worse cases | Calculate signed differences | Baseline delay, deadline breach, breach delta and recovered time remain distinct | P0 | unit |
| AC-F05-07 | Duration -1 / fraction / NaN in typed call | Calculate each invalid request | OUT_OF_RANGE or INVALID_NUMBER; no valid result | P0 | unit |
| AC-F05-08 | Closed cycle and downstream tail | Calculate with bounded test timeout | Returns CYCLE; witness excludes unrelated tail; never hangs | P0 | unit |
| AC-F05-09 | Slack fixture and 240-minute incident | Calculate both | Shifted tasks may have zero breach; main incident breach exactly 120 | P0 | unit |
| AC-F05-10 | Parallel join with tied constraints and slack | Inspect explanation edges/candidates | Only existing dependency IDs and actual binding constraints; no invented critical-path claims | P0 | unit |
| AC-F06-01 | Two matching options and one with foreign incidentId | Compare three alternatives | Matching source must be identical; foreign option causes INCIDENT_MISMATCH, with no mixed comparison | P0 | unit |
| AC-F06-02 | One, two, three, then four alternatives | Request comparison | 1–3 accepted; four rejected TOO_MANY_ALTERNATIVES; none silently hidden | P0 | integration |
| AC-F06-03 | Three-alternative comparison group | Read all result rows | Baseline/incident/option identities and revision preserved in consumption | P0 | E2E |
| AC-F06-04 | User estimate 50000 USD, explicit zero, and null in separate cases | Calculate and compare; edit cost only | Exact known amount or null retained; null labeled Not entered with warning; no inferred cost and timings unchanged | P0 | unit |
| AC-F06-05 | Unverified alternatives | Inspect comparison and brief text | No safest/optimal claim or automatic winner | P0 | E2E |
| AC-F06-06 | Approval-required task with not_required, pending, confirmed options | Calculate each | Missing flag invalid; pending conditional warning; confirmed metadata never inferred | P0 | unit |
| AC-F06-07 | Valid comparison; baseline frozen | Select preferred pending option | Only selection changes; approval remains pending; baseline unchanged | P0 | integration |
| AC-F07-01 | Selected valid pending recovery with null cost and same source | Build brief | Snapshots equal recalculation; all mentioned alternatives captured; null preserved, cost/approval warnings retained | P1 | integration |
| AC-F07-02 | Any generated brief | Read report | hypothetical=true; assumptions and operational validation disclaimer included | P1 | integration |
| AC-F07-03 | Brief with multiline plain text and numeric metrics | Copy and print | Readable sections preserve metric units and event timezone | P1 | E2E |
| AC-F07-04 | Brief with pending approval, assumptions and breach warnings | Copy/print | Every critical warning and qualification survives output | P1 | integration |
| AC-F07-05 | Selected but pending recovery | Build and export brief | Selection never changes approval; disclaimer says pending work remains unauthorized | P1 | integration |
| AC-F07-06 | Copy/print-only MVP with confidential local text | Inspect routing/network and export behavior | No public-sharing endpoint or URL; conditional sharing criterion deferred unless scope approved | P1 | integration |
| AC-F08-01 | Fresh landing page in future implementation | Activate demo CTA | Working demo opens without authentication | P1 | E2E |
| AC-F08-02 | All published copy and sample content | Review against evidence/source | No fabricated customers, ROI, capabilities or unlabeled fictional data | P1 | E2E |
| AC-F08-03 | Future desktop and 360px mobile viewport | Complete core workflows | Essential information/actions reachable; no critical overflow or lost navigation | P1 | E2E |
| AC-F08-04 | Keyboard-only session | Traverse and activate core workflows | Visible focus; no trap; alternatives to graph-only information | P1 | E2E |
| AC-F08-05 | OS/browser reduced motion enabled | Navigate future app | Nonessential motion reduced; functionality retained | P1 | E2E |
| INT-01 / PRD 6.1 | Dependency endpoint absent or foreign event | Validate | INVALID_REFERENCE/EVENT_MISMATCH before traversal; no timings | P0 | unit |
| INT-02 / PRD 6.4 | Incident target or recovery target missing | Validate | Explicit reference failure; no silently ignored modification | P0 | unit |
| INT-03 / PRD 6.5 | Configured minute and size boundaries | Test exact limit, limit+1, unsafe integer and overflow | Boundary accepted where feasible; excess rejected before arithmetic | P0 | unit |
| INT-04 / PRD 6.6 | USD/JPY/IDR amounts; mixed currency comparison | Serialize, format and compare | Integer minor units preserved; explicit currency exponents; mixed comparison rejected | P0 | integration |
| INT-05 / PRD 6.7 | Incident bound to launch-v0, current launch-v1 | Calculate | STALE_BASELINE, never silent rebase | P0 | unit |
| INT-06 / PRD 6.8, 7.6 | Protected Testing duration 60 | Try set 30, add -1, set 60, add 1 | Shortening rejected; equal/increase valid under adopted Q05 semantics | P0 | unit |
| INT-07 / PRD 6.10 | Saved future schema, corrupt JSON, missing fields | Load | Recoverable storage error; no automatic overwrite; deliberate reset available | P0 | integration |
| ENG-01 / PRD 7.6 | Linear chain and graph with no dependencies | Calculate | Recurrence correct for chain; no-edge tasks follow own lower bounds | P0 | unit |
| ENG-02 / PRD 7.6 | Combined edits on independent fields; duplicate edit pair | Apply recovery | Independent edits commute; duplicate pair rejected; no partial mutation | P0 | unit |
| ENG-03 / PRD 7.3 | Two deadlines, one baseline already late | Calculate | Every milestone reported; existing breach distinguished; no sum/hidden primary | P0 | unit |
| ENG-04 / PRD 7.3 | Recovery improves beyond baseline or worsens incident | Calculate | Signed recovered values exceed delay or become negative correctly | P0 | unit |
| ENG-05 / PRD 7.3 | Recovery-only duration edit on incident descendant | Inspect attribution | Shifted finish alone does not falsely imply incident-caused downstream start | P0 | unit |
| ENG-06 / PRD 7.5 | Main PRD example | Apply Power delay 240 | Power 240–360; Audio/Lighting 360–480; Testing 480–540; Rehearsal 540–660; Doors 660; breach 120 | P0 | unit |
| ENG-07 / PRD 7.3 | Diamond graph with explanation limit reached | Trace causes | Real sorted edges, all ties, deterministic truncation warning; timing/classification unaffected | P0 | unit |
| ENG-08 / PRD 7.3 | Recovery relaxes formerly binding predecessor | Recalculate earlier starts | Explanation includes relaxed baseline constraint and actual recovery cause | P0 | unit |
| ENG-09 / PRD 7.6 | Deep-frozen inputs including nested notes/modifications | Run baseline/incident/all recovery orders | No mutation; order of evaluating scenarios has no effect | P0 | unit |
| ENG-10 / PRD 7.1 | Duration 0, positive/negative lag, unsupported relationship | Validate and calculate | Zero and positive lag work; negative lag/other relationship rejected | P0 | unit |
| DATA-01 / PRD 6 | Duplicate IDs, duplicate edges, invalid enum, milestone nonzero | Validate | Specific stable errors; no valid-looking output | P0 | unit |
| DATA-02 / PRD 6 | Prototype-sensitive IDs or injected object keys | Parse/validate wire JSON | Rejected; no prototype mutation or inherited-map lookup | P0 | unit |
| TIME-01 / PRD 6, F02 | Reference near midnight and DST transition | Resolve calendar input and format elapsed minutes | Exact instants preserved across zones; nonexistent/ambiguous local input requires resolution | P0 | integration |
| BRIEF-01 / PRD F07 | Selected result from another revision or invalid option | Build brief | Recompute from same source or error; no forged stale snapshot promoted | P1 | integration |
| STORE-01 / PRD 9 reliability | Quota exhausted or storage disabled | Commit valid source and attempt save | In-memory work remains usable; explicit unsaved status; no false success | P0 | integration |
| STORE-02 / PRD 9 reliability | Two tabs with same old revision; lock unavailable variant | Attempt concurrent same-key saves | Lock plus revision re-read serializes commits; stale writer rejected; unsupported lock preserves session-only work with Unsaved | P0 | integration |
| PERF-01 / PRD 9 performance | Seeded 50-activity DAG; named modern hardware | Warm up and measure 1000 runs | Record p50/p95/max; compare local calculation with <200ms target; rendering separate | P1 | integration |
| REL-01 / PRD 9 reliability | Clean browser with caches empty | Open demo and execute all core workflows | No runtime errors; deterministic fictional seed; local execution available | P0 | E2E |
| SEC-01 / PRD 9 privacy | HTML/script-like user text in source and report | Render/copy/print | Plain text escaped in rendering/export; no script execution | P0 | integration |
| SEC-02 / PRD 9 privacy | Built public demo | Inspect bundle, sample and network routes | No browser secrets, confidential sample or unprotected public event endpoint | P0 | E2E |
| A11Y-01 / PRD 8 | Future app with form errors and dependency graph | Operate with keyboard and screen reader | Labels, errors, focus and text equivalents available; risk not color-only; AA target checked | P1 | E2E |
| SCOPE-01 / PRD 10, 13 | Implementation dependency graph and feature inventory | Review release contents | No backend/auth/payments/AI dependency or out-of-scope operations required | P0 | integration |

| COST-01 / C01 | Unknown cost null and explicit zero recovery cases | Calculate | Both timing-valid; null warning only for unknown; zero is never inferred | P0 | unit |
| COST-02 / C01 | Blank, partial, negative, overprecision and unsafe cost drafts | Run all costInputCases | Blank maps null; other invalids retain errors; exact minor-unit conversion with no rounding | P0 | unit |
| COST-03 / C01 | Three valid options with one null cost | Compare | Cost comparison marked incomplete; no arithmetic/default/cheapest ranking from null; valid timing rows retained | P0 | integration |
| COST-04 / C01 | Selected null-cost pending proposal | Build/copy/print brief | Preparation allowed; null, Not entered, pending conditions and disclaimer retained | P0 | integration |
| COST-05 / Q11 | Null amount with unsupported or different currency | Validate/compare | UNKNOWN_CURRENCY or CURRENCY_MISMATCH; unknown amount does not bypass currency validation | P0 | unit |
| COST-06 / Q11 | Entered amount; user changes currency | Commit without new amount confirmation | Block until explicit re-entry or clear-to-null; no conversion or silent relabeling | P0 | integration |
| STATE-01 / C06 | Valid result, then changed draft | Type, then Apply valid/invalid input | Dirty marks old result Not current and blocks compare/brief; only valid Apply commits new incident ID/result | P0 | integration |
| STATE-02 / C07 | No alternatives or no preference | Open comparison and attempt brief | No invented alternative/default choice; Add alternative available; brief disabled with reason | P0 | integration |
| STATE-03 / C07 | Preferred pending A | Select B twice | Exactly B selected, idempotent; approval remains pending; baseline unchanged | P0 | integration |
| STATE-04 / Q13 | Scenario v1 and newer current baseline v2 | Inspect/recalculate v1 then try with v2 | Retained v1 snapshot works with historical label; mismatched request gives STALE_BASELINE | P0 | integration |
| FIG-01 / C03 | Canonical demo seed across all presentations | Read identity and main incident | 15 Oct 2026, Asia/Jakarta, UTC reference 01:00Z, USD, Doors 17 baseline/19 incident, breach120 | P0 | integration |
| FIG-02 / C02 | canonical-figma-two-alternatives group | Apply A/B from the same incident | A17:00/recovered120/breach0/shifted5/downstream-shift4; B18:00/recovered60/breach60/shifted6/downstream-shift5; both null/pending | P0 | unit |
| FIG-03 / Q09 | duration-only-direct-finish-change fixture | Show counts | 3 shifted and 2 downstream shifted, but 0 incident-caused downstream; never announce zero total shift | P0 | integration |
| FIG-04 / Q06 | Externally verified status recording | Record confirmed with/without context | Application command requires nonblank supplied context; engine never verifies or authorizes operational work | P0 | integration |
| FIG-05 / Q14 | Clipboard rejects; print dialog canceled | Copy/print report | No false success; selectable text/retry for copy; print invocation never claims physical completion | P1 | E2E |
| FIG-06 / Figma R05 | Future browser at 320/375/390 plus tablet/desktop | Reflow and operate with keyboard/screen reader/200% text | Preserve approved design semantics; no lost fields/actions; static frame audit is not runtime certification | P1 | E2E |

## Additional release checks

PRD section 11 requires a real recorded demonstration, at least two explainably distinct recoveries, no critical runtime/mobile failures, and all P0 criteria passing. Run the three-alternative golden comparison and the browser workflow before declaring readiness. Customer validation and competition eligibility are outside technical test evidence; never infer traction or compliance from passing tests.

Conditional AC-F07-06 is satisfied here by the absence of public sharing; any later sharing feature requires new privacy tests and explicit scope review. Reset confirmations, storage states and export checks remain requirements for Bolt even though no visual design is supplied here.
