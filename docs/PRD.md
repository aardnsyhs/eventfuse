# EventFuse — Product Requirements Document (PRD)

**Version:** 1.0  
**Date:** October 15, 2026  
**Status:** Proposed MVP Specification  
**Target:** Bolt Builders Week 2026  
**Product Category:** B2B SaaS / Event Production Decision Intelligence

---

## 1. Product Overview

### 1.1 Product Name
EventFuse

### 1.2 Tagline
*Know what breaks before it happens.*

### 1.3 Product Definition

EventFuse is a contingency decision simulator designed for event production teams.

It helps production managers model schedule disruptions, understand downstream consequences, compare recovery strategies, and document decisions without modifying their original production schedule.

EventFuse is not intended to replace existing event management platforms. Its initial focus is helping users make better decisions when a production plan is at risk.

### 1.4 Core Product Promise

**From disruption to an actionable decision in minutes.**

### 1.5 Product Principles

1. **Clarity over complexity:** Prioritize actionable consequences instead of raw project information.
2. **Trustworthy calculations:** All schedule calculations must be deterministic, reproducible, and explainable.
3. **Safe experimentation:** Simulations must never mutate the original event plan.
4. **Decision-focused experience:** Every scenario should help answer a meaningful operational question.
5. **Transparent assumptions:** Estimated costs, durations, and recovery outcomes must be identified as assumptions where appropriate.
6. **Focused workflow:** Avoid becoming a general-purpose project management system.
7. **Design with identity:** Build a distinctive, polished product without sacrificing usability.

---

## 2. Problem Statement

Event production involves interdependent activities such as:

- Electrical installation
- Audio and lighting setup
- Stage preparation
- Technical testing
- Rehearsals
- Venue readiness
- Doors opening

A delay in one activity can create cascading changes across the production schedule.

Many teams rely on spreadsheets, messaging applications, production schedules, or project management tools to coordinate these activities.

However, interpreting the consequences of a disruption and comparing recovery decisions can still involve significant manual reasoning.

### Key Problems

**P1 — Hidden downstream impact**

A production manager may know that a vendor is delayed without immediately knowing which subsequent activities are affected.

**P2 — Difficult recovery comparisons**

Different interventions may recover different amounts of time, introduce costs, or require approvals.

**P3 — Fragmented decision context**

The reason behind a recovery decision can be lost across conversations, spreadsheets, and documents.

**P4 — Limited opportunities for safe experimentation**

Changing the live production schedule to test a hypothetical alternative can introduce confusion or accidental changes.

### Important Market Qualification

These problems are hypotheses informed by existing industry workflows. Customer willingness to pay for a dedicated simulator has not yet been established.

---

## 3. Target Users

### Primary Persona — Production Manager

Works for a small or medium production agency handling corporate launches, conferences, exhibitions, or technically complex events.

**Responsibilities:**
- Coordinating production milestones
- Responding to vendor delays
- Reviewing recovery alternatives
- Communicating operational decisions

**Primary need:**
Understand how a disruption changes an event's critical milestones and which feasible intervention minimizes its consequences.

### Secondary Persona — Technical Director

Oversees technical dependencies involving electrical work, AV, staging, rigging, and testing.

**Primary need:**
Understand which technical activities depend on each other, without receiving misleading recommendations that ignore safety or operational constraints.

### Buyer Persona — Agency Owner / Head of Production

**Primary need:**
Reduce the operational and financial impact of disruptions while improving decision accountability.

### Non-Target Users for MVP

- General wedding planning consumers
- Ticket buyers and attendees
- Large enterprise event organizations requiring complex integrations
- Venue booking marketplaces

---

## 4. Jobs to Be Done

### JTBD-01 — Understand disruption

"When a vendor reports a delay, I want to see which activities and milestones will be affected so that I can respond before the delay causes further problems."

### JTBD-02 — Explore alternatives

"When the original plan is no longer feasible, I want to compare realistic recovery options so that I can make a time-and-cost-aware decision."

### JTBD-03 — Communicate decisions

"When I choose an intervention, I want a concise, shareable explanation of its impact, cost, assumptions, and required approvals."

### JTBD-04 — Preserve the baseline

"When exploring a hypothetical disruption, I want my original production plan to remain unchanged."

---

## 5. MVP Scope and Feature Requirements

### F01 — Public Interactive Demo

**Priority:** P0

A public sample event must be accessible without account registration.

Requirements:
- One-click access from the landing page.
- Preconfigured realistic sample production plan.
- Users can simulate disruptions immediately.
- Users can reset the demo to its original state.
- Sample data must be labeled as fictional.
- A fresh visitor must not inherit another visitor's edits.

**Acceptance Criteria**
- AC-F01-01: A first-time visitor can access the demo without authentication.
- AC-F01-02: The sample contains at least six meaningful activities or milestones.
- AC-F01-03: Simulation results update after valid inputs change.
- AC-F01-04: Reset restores the original demo state.
- AC-F01-05: Sample data is isolated between visitors.
- AC-F01-06: Core functionality does not require paid AI APIs.

### F02 — Event Workspace

**Priority:** P0

The workspace displays an event's identity and operational context.

Required fields:
- Event name
- Event description (optional)
- Event date
- Timezone
- Event location (optional)
- Production start reference
- Critical milestone or event start deadline

**Acceptance Criteria**
- AC-F02-01: Users can create a local event in the MVP.
- AC-F02-02: All required fields are validated.
- AC-F02-03: Invalid dates and missing names generate clear errors.
- AC-F02-04: Event information persists across normal page refreshes in the supported storage mode.
- AC-F02-05: The demo works without server-side persistence.

### F03 — Event Blueprint

**Priority:** P0

Users can model the production schedule as activities and dependencies.

Each activity includes:
- Name
- Assigned vendor or owner (optional)
- Earliest permitted start
- Duration
- Dependencies
- Safety classification
- Operational notes

Dependencies use finish-to-start relationships in MVP.

**Acceptance Criteria**
- AC-F03-01: Users can create, edit, and delete activities.
- AC-F03-02: Users can connect activities using valid finish-to-start dependencies.
- AC-F03-03: A task cannot depend on itself.
- AC-F03-04: Circular dependencies are rejected.
- AC-F03-05: Deleting a task safely resolves or removes references to that task.
- AC-F03-06: Parallel tasks are supported.
- AC-F03-07: Multiple predecessor tasks are supported.
- AC-F03-08: A zero-duration milestone is supported.
- AC-F03-09: A changed blueprint triggers recalculation.

### F04 — Scenario Lab

**Priority:** P0

Users can explore hypothetical changes without modifying the baseline plan.

Supported scenario changes:
- Activity start constraints or vendor arrival delays
- Activity duration changes
- Recovery interventions that modify permitted scheduling parameters
- Optional additional recovery cost

**Acceptance Criteria**
- AC-F04-01: A scenario is created from the current baseline.
- AC-F04-02: Changes affect the scenario only.
- AC-F04-03: Baseline remains unchanged after editing, resetting, or deleting a scenario.
- AC-F04-04: Input controls have clear units and boundaries.
- AC-F04-05: Invalid inputs cannot produce valid-looking results.
- AC-F04-06: Users can restore a scenario's initial parameters.
- AC-F04-07: Simulation outputs show their assumptions.

### F05 — Impact Analysis

**Priority:** P0

The simulation engine calculates the operational consequences of each scenario.

Required outputs:
- Updated start and finish times
- Tasks whose schedule shifted relative to baseline
- Affected downstream tasks
- Delay at critical milestones
- Additional recovery cost
- Comparison against baseline
- Explanation of the dependency path contributing to delays

**Acceptance Criteria**
- AC-F05-01: Identical inputs always produce identical outputs.
- AC-F05-02: Results are calculated without an AI model.
- AC-F05-03: Tasks are evaluated in a valid topological order.
- AC-F05-04: Parallel branches calculate independently.
- AC-F05-05: Multiple predecessors use the latest predecessor finish.
- AC-F05-06: Delay values are calculated relative to the relevant baseline.
- AC-F05-07: No negative task durations are accepted.
- AC-F05-08: Cyclic graphs never enter an infinite computation loop.
- AC-F05-09: Deadline violations are clearly distinguished from ordinary schedule changes.
- AC-F05-10: Causal explanation traces actual dependencies and does not invent reasons.

### F06 — Recovery Compare

**Priority:** P0

Users can compare up to three alternative interventions against the same disruption.

Required comparison dimensions:
- Predicted milestone delay
- Additional direct intervention cost
- Number of shifted tasks
- Required approvals
- Unverified assumptions
- Safety or feasibility warnings

**Acceptance Criteria**
- AC-F06-01: Every alternative uses the same base incident when compared.
- AC-F06-02: Up to three alternatives are visible in one comparison view.
- AC-F06-03: The interface clearly identifies baseline, unmitigated incident, and each recovery option.
- AC-F06-04: Costs are user-supplied assumptions, not automatically inferred market prices.
- AC-F06-05: The application does not label an alternative as safest or optimal without sufficient verified constraints.
- AC-F06-06: An intervention requiring approval is explicitly flagged.
- AC-F06-07: Users can select a preferred alternative without modifying the baseline.

### F07 — Decision Brief

**Priority:** P1

Provide a compact record explaining a selected recovery option.

Required sections:
- Event identity
- Incident description
- Baseline milestone
- Predicted disrupted milestone
- Selected recovery option
- Expected improvement
- Estimated additional cost
- Affected activities
- Assumptions and constraints
- Required approvals
- Next actions

**Acceptance Criteria**
- AC-F07-01: Brief uses calculated scenario outputs.
- AC-F07-02: Brief identifies hypothetical information.
- AC-F07-03: Brief can be copied or printed as a readable report.
- AC-F07-04: Critical warnings remain present in the exported or copied content.
- AC-F07-05: The application never implies that an unapproved intervention has been authorized.
- AC-F07-06: Public sharing, if supported, excludes confidential data unless explicitly selected.

### F08 — Landing Page

**Priority:** P1

The landing page must communicate the problem, product value, and demo accessibility.

Required content:
- Product identity
- Clear value proposition
- Concise explanation of the simulation process
- Interactive-demo entry point
- Target customer segment
- Fictional-data disclosure

**Acceptance Criteria**
- AC-F08-01: The primary CTA leads to the working interactive demo.
- AC-F08-02: The page does not make unsupported customer, ROI, or product capability claims.
- AC-F08-03: Layout works on desktop and mobile.
- AC-F08-04: The experience is accessible by keyboard.
- AC-F08-05: Animations respect reduced-motion preferences.

---

## 6. Data Model

The MVP should use typed entities with stable IDs and explicit relationships. The following schema is logical, not a finalized SQL schema.

### Entity: Event

- id: UUID/string
- name: string
- description: string | null
- timezone: IANA timezone identifier
- date: ISO date
- location: string | null
- createdAt: ISO datetime
- updatedAt: ISO datetime
- schemaVersion: integer

### Entity: Activity

- id: UUID/string
- eventId: Event.id
- name: string
- ownerName: string | null
- earliestStartMinute: integer
- durationMinutes: non-negative integer
- classification: `normal | approval_required | protected`
- notes: string | null
- isMilestone: boolean

All activity times are measured as elapsed minutes from the event's reference instant. Store the event timezone separately for display.

### Entity: Dependency

- id: UUID/string
- eventId: Event.id
- predecessorId: Activity.id
- successorId: Activity.id
- type: `finish_to_start`
- lagMinutes: integer, default 0

For MVP, allow non-negative lag only. Negative lag and other dependency types are out of scope.

### Entity: CriticalMilestone

- id: UUID/string
- eventId: Event.id
- activityId: Activity.id
- deadlineMinute: integer
- label: string

A critical milestone references an activity, normally one with zero duration.

### Entity: Incident

- id: UUID/string
- eventId: Event.id
- title: string
- description: string | null
- targetActivityId: Activity.id
- startDelayMinutes: non-negative integer
- createdAt: ISO datetime

### Entity: RecoveryOption

- id: UUID/string
- incidentId: Incident.id
- name: string
- description: string | null
- costMinorUnits: non-negative integer
- currency: ISO 4217 code
- modifications: RecoveryModification[]
- approvalStatus: `not_required | pending | confirmed`
- assumptionNotes: string[]
- status: `draft | selected`

### Entity: RecoveryModification

- activityId: Activity.id
- field: `earliest_start | duration`
- operation: `set | add`
- valueMinutes: integer

Modifications must be validated before the engine runs.

### Entity: ScenarioResult

Derived from a baseline, incident, and recovery option.

- scenarioId: string
- activityTimings: map of activity ID to start and finish
- shiftedActivityIds: string[]
- affectedMilestones: array
- deadlineBreaches: array
- recoveryCostMinorUnits: integer
- explanationPaths: array of dependency chains
- validationWarnings: string[]

Scenario results are derived data. They must not overwrite activities or baseline times.

### Entity: DecisionBrief

- id: string
- eventId: Event.id
- incidentId: Incident.id
- selectedRecoveryOptionId: RecoveryOption.id
- baselineVersion: string
- scenarioSnapshot: serialized validated result
- authorLabel: string | null
- createdAt: ISO datetime
- approvalDisclaimer: string

### Data Integrity Invariants

1. Every dependency endpoint must exist in the same event.
2. An activity cannot depend on itself.
3. Dependency graphs must be acyclic.
4. Every incident must reference an existing activity.
5. Durations and start offsets must remain within configured limits.
6. Currency values use integer minor units, never floating-point storage.
7. A scenario must reference a known baseline version.
8. A protected activity cannot have its duration shortened by a recovery operation.
9. Deleting a referenced entity must invalidate or explicitly reconcile dependent records.
10. Persisted schema versions must be checked before restoring local data.

---

## 7. Simulation Algorithm

### 7.1 Model

The MVP uses a deterministic directed acyclic graph (DAG) with finish-to-start dependencies.

For each task `i`:

`ES(i) = max(S(i), max(EF(j) + lag(j,i)))`

`EF(i) = ES(i) + D(i)`

Where:

- `ES`: earliest feasible start
- `S`: earliest allowed start
- `EF`: earliest finish
- `D`: duration
- `j`: direct predecessors

For activities with no predecessors, use their earliest allowed start.

### 7.2 Required Processing Steps

1. Validate all event data.
2. Validate activity references and dependencies.
3. Reject circular dependencies.
4. Create a baseline snapshot.
5. Calculate baseline activity timings in topological order.
6. Apply incident modifications to a separate immutable scenario copy.
7. Validate proposed recovery modifications.
8. Calculate scenario timings.
9. Compare scenario results against baseline and the unmitigated incident.
10. Identify milestone breaches.
11. Trace causal dependency paths where feasible.
12. Return structured results and warnings.

### 7.3 Comparison Rules

Distinguish the following:

- **Shifted task:** Start or finish changed relative to baseline.
- **Downstream affected task:** A dependency-related consequence of the incident.
- **Deadline breach:** A milestone finishes after its configured deadline.
- **Recovered time:** Reduction in delay relative to the unmitigated incident.
- **Additional recovery cost:** User-specified cost of the selected intervention.
- **Critical path:** Do not claim full critical-path analysis unless a proper critical-path calculation is implemented and tested.

A shifted task is not automatically a deadline breach.

A task may be downstream of the incident but remain unchanged because its planned start includes sufficient slack.

### 7.4 Recovery Safety

- No automatic authorization of vendor work.
- No autonomous changes to a real production schedule.
- No shortening of protected activities.
- No claim that additional staffing always produces linear time savings.
- No fabricated vendor availability or market cost data.
- Alternatives with pending approvals remain conditional.
- Results must carry an operational validation disclaimer.

### 7.5 Deterministic Example

Baseline:
- Power: 08:00–10:00
- Audio: 10:00–12:00, depends on Power
- Lighting: 10:00–12:00, depends on Power
- System Testing: 13:00–14:00, depends on Audio and Lighting
- Rehearsal: 14:00–16:00, depends on Testing
- Doors Open: 17:00, depends on Rehearsal

Incident: Power starts four hours late.

Expected:
- Power: 12:00–14:00
- Audio: 14:00–16:00
- Lighting: 14:00–16:00
- Testing: 16:00–17:00
- Rehearsal: 17:00–19:00
- Doors Open: 19:00
- Milestone delay: 120 minutes

A scenario with an earlier permissible start or approved reduction to other eligible durations can recover time.

All example timestamps are local to the configured event timezone.

### 7.6 Engine Unit Tests

Minimum:
- Linear dependency chain
- Parallel independent tasks
- Multiple predecessors
- No dependencies
- Zero-duration milestone
- Positive dependency lag
- Circular dependency rejection
- Missing activity reference
- Negative duration rejection
- Incident within available schedule slack
- Incident causing deadline breach
- Combined recovery modifications
- Protected-task mutation rejection
- Baseline immutability
- Stable results across repeat calculations
- Recovery comparison consistency

---

## 8. UX and Information Architecture

### Primary Navigation

1. Workspace
2. Event Blueprint
3. Scenario Lab
4. Recovery Compare
5. Decision Brief

### Required Screens

**S01 — Marketing Landing Page**
- Value proposition
- Product demonstration context
- Primary demo CTA
- Explanation of workflow

**S02 — Workspace**
- Event overview
- Critical milestone summary
- Upcoming activities
- Current scenarios
- Entry to sample event

**S03 — Event Blueprint**
- Dependency graph
- Activity list/timeline
- Create/edit activity
- Dependency management
- Validation states

**S04 — Scenario Lab**
- Select incident target
- Configure delay
- View baseline versus simulated state
- Explore downstream impact
- Read warnings

**S05 — Recovery Compare**
- Comparison of up to three alternatives
- Time and cost metrics
- Feasibility/approval status
- Ability to select a preferred option

**S06 — Decision Brief**
- Explanation of incident and selected option
- Impact summary
- Assumptions and approvals
- Copy/print actions

### Required Supporting States

- Empty event workspace
- First-use guidance
- Loading states where applicable
- Invalid dependency
- Invalid simulation input
- No downstream effect
- Deadline protected
- Deadline breached
- Pending approval
- Recovery option not feasible
- Storage failure
- Reset confirmation where destructive

### Responsive Behavior

Desktop is the primary environment for complex schedule analysis.

Mobile must remain functional:
- All information must be available without hover.
- Large graphs may use a dedicated scroll/zoom canvas with an accessible list alternative.
- Recovery comparisons must adapt to stacked layouts.
- Controls must be operable by touch.
- No essential actions may become inaccessible.

### Accessibility Requirements

- WCAG 2.2 AA as design and implementation target.
- Keyboard navigation.
- Visible focus indication.
- Sufficient contrast.
- Reduced-motion support.
- Accessible labels and form errors.
- Avoid conveying risk solely through color.
- Provide text equivalents for graphical schedule information.

---

## 9. Non-Functional Requirements

### Performance

- Simulation of a 50-activity event should normally complete interactively on a modern desktop.
- Target response for local recalculation: under 200 ms for the reference dataset and typical supported hardware.
- Heavy visual rendering must not block the correctness of calculations.
- Avoid unnecessary external network dependencies for demo execution.

These are performance targets, not guaranteed outcomes without measurement.

### Reliability

- Scenario changes must not mutate persisted baseline data.
- Invalid saved data must fail safely with an understandable recovery path.
- Repeatable test fixtures must be included.
- Demo must work from a clean browser session.

### Privacy and Security

- No confidential customer production data in the public sample.
- No unprotected public access to private events.
- No browser-side secrets.
- Sanitize all user-provided text.
- Do not introduce publicly editable shared event URLs without authorization controls.
- Local demo persistence must clearly indicate that it is stored in the current browser.

### Technology Constraints

Recommended:
- React + TypeScript + Vite
- Tailwind CSS
- shadcn/ui or equivalent accessible primitives
- React Flow for dependency visualization
- Motion for restrained, purposeful animations
- Pure TypeScript simulation engine
- Local-first persistence for the competition demo
- Bolt-supported hosting

Do not require:
- NestJS microservices
- External AI APIs
- Payment gateway
- Real-time collaboration
- Complex background job infrastructure
- Custom authentication for public demo
- Native mobile applications

---

## 10. Out of Scope

The following are explicitly excluded from the competition MVP:

- Ticketing
- Guest registration
- Venue booking
- Vendor marketplace
- Inventory management
- Crew payroll
- Automated supplier communication
- Real-time sensor/IoT integrations
- Automatic safety certification
- AI-generated operational approvals
- Full resource-constrained scheduling optimization
- Multi-organization permission systems
- Complex ERP integrations
- Subscription checkout

---

## 11. Success Metrics

### Competition Readiness

- Public demo loads without login.
- All P0 acceptance criteria pass.
- Scenario engine passes deterministic tests.
- At least one incident visibly propagates across several dependencies.
- At least two recovery alternatives produce distinct, explainable outcomes.
- Decision brief matches calculated results.
- No critical mobile navigation issue.
- No critical runtime errors.
- Recorded demo shows real working functionality.

### Early Product Validation

Measure:
- Users who launch the demo
- Users who run a simulation
- Users who compare recovery options
- Users who generate a decision brief
- Qualified customer interview feedback
- Trial requests using actual production workflows

Do not claim commercial traction before receiving actual evidence.

---

## 12. Build Phases

### Phase 0 — Product Contract
- Finalize domain model and invariants
- Freeze MVP scope
- Define sample event and test fixtures
- Approve Figma user flows

### Phase 1 — Design in Figma
- Explore visual direction
- Establish design foundations
- Design primary screens and supporting states
- Create interactive prototype
- Review responsiveness and accessibility
- Approve implementation-ready design

### Phase 2 — Technical Foundation in Bolt
- Create new Bolt project
- Initialize app structure
- Define TypeScript models
- Build reusable UI primitives
- Implement local persistence

### Phase 3 — Event Blueprint
- Implement event workspace
- Implement activity and dependency CRUD
- Add DAG validation
- Render schedule and dependency graph

### Phase 4 — Simulation Engine
- Implement baseline calculation
- Apply isolated incident changes
- Calculate downstream impacts
- Add deterministic tests

### Phase 5 — Recovery Intelligence
- Implement recovery modifications
- Compare scenarios
- Calculate time/cost differences
- Surface warnings and assumptions

### Phase 6 — Decision Brief and Demo
- Build decision report
- Populate realistic sample data
- Refine first-use experience
- Verify mobile interactions

### Phase 7 — Quality and Submission
- Functional testing
- Accessibility checks
- Responsive testing
- Production deployment
- Demo recording
- Submission verification

---

## 13. Final Product Guardrails

1. Do not sacrifice simulation correctness for visual polish.
2. Do not present fictional figures as real customer data.
3. Do not conflate simulated recovery with operational approval.
4. Do not require login to explore the public demo.
5. Do not expand the MVP into a general-purpose event management system.
6. Do not mutate the baseline when users explore alternatives.
7. Do not introduce paid AI dependencies without explicit justification.
8. Preserve a strong, distinctive visual identity while keeping the product usable.
9. Favor complete, verifiable workflows over numerous incomplete screens.
10. All implementation decisions must remain consistent with the approved PRD.

**End of PRD v1.0**