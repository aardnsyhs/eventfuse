# Technical architecture

Use the existing React + TypeScript + Vite direction in PRD section 9. Contract freeze-1 adopts these module boundaries. No application, backend or design work is part of this preparation.

## Dependency direction

Future presentation consumes application state/selectors. Application commands consume domain validation, engine public APIs and persistence ports. Domain and engine depend only on plain TypeScript contracts. Storage, time formatting and text export adapters depend on the contracts; the engine imports none of them. A visual graph library receives a derived projection and sends validated editing intents; its nodes are never the schedule database.

Future folders:

| Folder | Responsibility |
|---|---|
| `src/domain/` | Source and result types, schema versions, field/reference validation |
| `src/engine/` | DAG validation, recurrence, incidents, recovery, comparisons, explanations, briefs |
| `src/application/` | Commands, revision ownership, selection, scenario reset, result status |
| `src/adapters/storage/` | Local JSON envelope, load/save/error handling, schema migration |
| `src/adapters/time/` | IANA calendar input resolution and elapsed-minute formatting |
| `src/adapters/export/` | Readable brief copy/print serialization retaining warnings |
| `src/demo/` | Fictional immutable seed and reset factory |
| `src/engine/__tests__/` | Golden fixtures, algorithm invariants and property tests |
| Presentation folders | Deferred to Bolt and the independent design handoff |

No database server, ORM, separate API service, auth, payments, AI, workers or network access is needed for the core demo. Avoid adding dependencies or changing the current scaffold during preparation. Reuse the repo toolchain when implementing in Bolt; verify then-current compatibility there.

## Application ownership

One application owner holds the current baseline snapshot/revision, source incidents, recovery options, selection, local persistence status, and calculation state. React consumes it through a small reducer/store interface; do not introduce a global-state library before there is a need. Keep incomplete editing drafts separate from validated source records. Baseline edits commit atomically, create and retain a new baselineVersion, and invalidate current-view caches. Each immutable incident content record binds to a retained revision. Old scenarios remain inspectable against their captured snapshot; never combine their results with the current revision or silently migrate them. Changing a committed incident creates a new incident ID and clears active option selection; old source records remain for pinned history/briefs.

Derive results through pure engine calls, keyed by normalized source plus engineVersion and revision. Memoization is optional and must not affect correctness. Sources are authoritative; result caches are not. A worker is optional only after measuring the 200 ms target; it uses the exact same serializable request/result contract and rejects stale responses by request token.

## Local-first persistence

Frozen envelope: `{schemaVersion: 1, storageRevision, currentBaselineVersion, baselineVersions, incidents, recoveryOptions, selectedOptionByIncident, decisionBriefs}`. baselineVersions is a JSON record of revision string to complete BaselineSnapshot; each key equals its snapshot.baselineVersion. Resolve an incident through its captured revision. A zero-entity validated BaselineSnapshot is a persisted draft; only runnable snapshots enter calculate. This small document structure needs no database or history service. Use distinct namespaced keys: `eventfuse:v1:demo:launch` and `eventfuse:v1:workspace:<eventId>`. storageRevision is an opaque caller-owned concurrency token replaced on every saved envelope change, including incident/option/selection/brief changes; it is not baselineVersion. Demo reset replaces only the demo envelope with a fresh seed; scenario reset creates a fresh zero-delay incident record on the active captured baseline and clears active recovery/options/selection/drafts, without editing baseline. The old committed incident/options remain historical if referenced; demo reset restores only the demo namespace. Explain any destructive reset and obtain its normal product confirmation in Bolt, per PRD section 8. No reset action is implemented here.

Start with a small localStorage adapter, one envelope per local workspace. Snapshot to JSON, validate size and source integrity, then one setItem; catch quota/disabled-storage errors and keep in-memory state functional with an unsaved status. Cap stored envelope size at the frozen default 2 MiB and reject oversized loads before parsing. Do not promise browser durability or isolation between people sharing one browser profile. Incognito/clean profiles start with independent seed copies; no public shared mutable backend state. Serialize same-key writes with a browser lock in the future storage adapter, re-read storageRevision within the lock and reject stale commits. Without lock support, retain session-only work and an explicit unsaved status rather than promise cross-tab atomicity. A read-then-write revision check alone is not atomic; two tabs can both pass it. Conflicts require an explicit reload/keep-local choice, never silent overwrite. Browser support must be tested in Bolt.

Recovery source envelopes preserve nullable amounts exactly, plus optional approval conditions/context. Unknown cost and pending approval do not invalidate persisted source. Do not serialize number defaults over null. Keep uncommitted malformed form text separate; never turn it into a valid-looking saved estimate. Decision briefs preserve all comparison snapshots that their text mentions.

On load: read with exception handling, parse unknown JSON, check schemaVersion, validate graph and references, then hydrate. Unknown/future schema never gets silently downgraded or overwritten. Invalid local data yields a recoverable storage-error state and a deliberate reset path. Do not automatically delete it or execute stored markup. Persist current source after a valid command; save failure is not calculation failure. Audit snapshots are immutable historic data and may outlive the baseline they record.

## Quality boundaries

Engine unit tests need no DOM. Persistence integration uses an in-memory storage double plus browser smoke tests. Application integration proves edits/revisions/reset do not mutate baseline. Future E2E covers demo access, isolation, compare, brief copy/print, keyboard and responsive operation; design details remain owned by the separate workstream. See ACCEPTANCE_TEST_MATRIX for exact PRD coverage.

Treat text as plain text, escape in HTML/report exports, never inject source into innerHTML, and include no secrets or confidential sample data. No publicly shared event URLs are planned. Copy/print is local output, not public hosting. Private events are browser-local, with no claim of authenticated access control or cross-device security. No competition compliance claim follows from importing this package; submission rules must be checked separately by the owner.

This is a preimplementation schema freeze, not a deployed schema migration. Existing numeric estimates remain valid. Any older envelope with a different structure must pass a deliberate adapter migration or fail safely; sharing schemaVersion 1 is not permission to silently coerce an incompatible record. Contract revision freeze-1 identifies the specification; engineVersion 1 remains unchanged because no production engine has been implemented or shipped here.
