# EventFuse

**Know what breaks before it happens.**

EventFuse is a browser-based contingency simulator for event production teams. Model activities and dependencies, apply a hypothetical disruption, compare recovery proposals, and prepare a decision brief while preserving the original production plan.

## Features

- **Landing:** product overview and access to a fictional, editable demonstration.
- **Workspace:** create local events, edit event details, and manage saved workspaces.
- **Blueprint:** edit activities, finish-to-start dependencies and critical milestones; inspect timelines and an interactive dependency graph.
- **Scenario Lab:** apply or reset an incident, inspect schedule changes, and distinguish milestone breaches from ordinary shifts.
- **Recovery Compare:** compare up to three independent proposals, including recovered time, user-entered costs, assumptions and approval requirements. Choose a preferred proposal explicitly.
- **Decision Brief:** capture a proposal and its calculated results, then copy or print the report with its assumptions and approval warnings.

Baseline edits create immutable revisions. Historical scenarios remain tied to their captured revisions. Pending approval does not mean authorization, and an unknown recovery cost appears as **Not entered**, never an invented zero.

The interface includes light/dark themes, keyboard controls, reduced-motion support and responsive layouts. Dragging graph nodes changes their visual placement only; activity editing controls change scheduling inputs.

## Technology

- React 19, TypeScript 6 and Vite 8
- Tailwind CSS 4 and shadcn/ui components built on Base UI
- Motion for React, React Flow and Lucide icons
- React DayPicker, date-fns and UTC date helpers
- Locally bundled Inter and IBM Plex Mono fonts
- A deterministic TypeScript scheduling engine, typed application commands and browser-local persistence

## Requirements and installation

- Node.js 22.12 or newer; development checks have been run with Node.js 24.18.0.
- Yarn 4.18.0, pinned by `packageManager` in `package.json`.
- A modern browser. Saving requires localStorage, Web Locks and browser cryptographic randomness. Use localhost for development or HTTPS when hosted.

From the repository directory, with Corepack available:

```sh
corepack enable
yarn install --immutable
```

Yarn uses the `node-modules` linker configured in `.yarnrc.yml`. Use Yarn for dependency changes and commit the resulting `yarn.lock`. No environment variables, API keys or backend services are required to run the application.

## Development and production builds

```sh
yarn dev
```

| Command | Purpose |
|---|---|
| `yarn typecheck` | Check application and build configuration types |
| `yarn lint` | Run ESLint |
| `yarn build` | Typecheck and generate the production application in `dist/` |
| `yarn preview` | Serve the production build locally for inspection |

To inspect a production build:

```sh
yarn typecheck
yarn lint
yarn build
yarn preview --host 127.0.0.1 --port 4174 --strictPort
```

Vite preview is a local inspection server. For hosting, serve the generated `dist/` directory over HTTPS. Application routes use URL hashes: `/#landing`, `/#workspace`, `/#blueprint`, `/#scenario`, `/#compare` and `/#brief`.

## Main workflow

1. Open the fictional demo from the landing page, or create a local event in Workspace.
2. Review activities, dependencies, timing constraints and milestone deadlines in Blueprint. Save activity drafts and explicitly apply a baseline revision.
3. Choose an incident target and delay in Scenario Lab, then select **Apply delay**. Draft changes do not silently become current results.
4. Create recovery proposals in Recovery Compare. Review timing, cost, assumptions and approval requirements before marking a preferred proposal.
5. Prepare a Decision Brief. Copy or print it with its warnings intact.
6. Select **Save workspace** to persist the current workspace in this browser. Reloading saved work or resetting an incident/demo requires explicit confirmation when work would be discarded.

The canonical demo uses October 15, 2026 in Asia/Jakarta, with reference instant `2026-10-15T01:00:00Z`. Baseline Doors Open is 17:00. A Power delay of +240 minutes moves Doors Open to 19:00, breaching its deadline by 120 minutes. Proposal A restores 17:00; proposal B restores 18:00. Both proposals initially have pending approvals and unknown additional costs.

## Local data and persistence

Edits stay in memory until **Save workspace** is selected. Opening the fictional demo can initialize its saved seed when storage is available. Saved event documents use localStorage with separate demo and user-workspace namespaces. Theme preference is also stored locally.

There is no server database, account system, cloud backup or synchronization across browsers/devices. Clearing browser site data removes saved work. Private browsing, storage restrictions and quota limits can prevent durable storage. The interface reports unsaved, unavailable, corrupt or conflicting storage states rather than claiming a successful save.

Writes use Web Locks and stored revision checks to protect against conflicting tabs. If those capabilities are unavailable, saving is refused and the current session remains usable. Restored documents undergo runtime schema and reference validation. Stored event documents are limited to 2 MiB measured as UTF-16 data.

**Reset incident** restores a zero-delay scenario without altering its baseline. **Reset demo** restores the fictional example in its separate namespace; it does not erase unrelated local events. Save explicitly to persist a reset. Copy/print produces a local report, not a public sharing link.

## Source layout

```text
src/
  application/                Commands, revision ownership and selectors
  components/ui/              Shared Base UI/shadcn presentation primitives
  demo/                       Runtime fictional event data and initialization
  domain/                     Types, currency metadata and validation
  engine/                     Scheduling, comparison, explanations and briefs
  infrastructure/persistence/ Browser storage adapters
  lib/                        Shared utilities
  presentation/               Screens, forms and React integration
```

## Limitations

- Schedules use finish-to-start dependency graphs. Resource allocation, vendor availability, safety certification and full critical-path analysis are outside the model.
- Results are hypothetical. A preferred proposal does not authorize operational work. Protected activities and approval requirements remain subject to real-world review.
- Costs are user-supplied estimates. Supported currencies are USD, GBP, EUR, IDR and JPY, with no exchange-rate conversion.
- Local browser storage is not authenticated access control or a durable backup. Concurrent edits require explicit conflict recovery.
- The main JavaScript bundle currently triggers Vite's chunk-size warning. Build success is not a performance or production-readiness certification.
- Automated test suites are not included. Run the development checks and inspect the six screens, canonical workflow, storage, dialogs and graph interactions when changing the application; smoke checks do not provide comprehensive regression coverage.

## Development tools and attribution

EventFuse was prepared for Bolt.new and the Bolt Builders Week workflow. Its visual design comes from the EventFuse [Figma design](https://www.figma.com/design/dJytvLMR5sdBXH9876y3PP), with implementation and maintenance assistance from Codex. Bolt.new and coding assistants are development tools; the running application does not require an AI service.

The application uses the open-source libraries listed above and in `package.json`; their respective licenses and attributions continue to apply. There is no claim of endorsement by those tools or of competition eligibility.

## License

No project license file or `license` field is currently supplied for EventFuse.
