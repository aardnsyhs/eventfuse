import { ArrowUpRight } from "lucide-react";
import { Kicker, LinkButton, Panel, Status } from "@/presentation/shared";
import { Schedule } from "@/presentation/Schedule";
import { recoverySamples } from "@/presentation/sample";

export function Landing() {
  return (
    <>
      <header className="flex items-center justify-between gap-4 border-b px-5 py-4 md:px-8">
        <a
          href="#landing"
          className="py-2 text-[23px] font-bold tracking-[-0.8px]"
        >
          EventFuse
        </a>
        <nav
          aria-label="About EventFuse"
          className="hidden gap-7 font-mono text-xs text-muted-foreground md:flex"
        >
          <a href="#why">Why EventFuse</a>
          <a href="#workflow">The workflow</a>
          <span>Fictional demo</span>
        </nav>
        <LinkButton to="workspace">Open demo</LinkButton>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-[1600px] outline-none"
      >
        <section className="space-y-7 border-b px-5 py-14 md:px-16 md:py-20">
          <Kicker>01 / Contingency intelligence for event production</Kicker>
          <h1
            tabIndex={-1}
            className="max-w-[1100px] text-5xl leading-[1.08] font-semibold tracking-[-1.5px] outline-none md:text-[80px]"
          >
            Know what breaks
            <br className="hidden sm:block" /> before it happens.
          </h1>
          <div className="grid gap-7 md:grid-cols-[1.3fr_1fr]">
            <p className="max-w-[760px] text-lg leading-relaxed md:text-2xl">
              A delayed arrival is one change. The consequences are connected.
              Test the disruption, compare conditional responses, and take a
              clear proposal into the production meeting.
            </p>
            <div className="space-y-3 md:self-center">
              <LinkButton to="workspace" className="w-full sm:w-auto">
                Open the fictional demo
              </LinkButton>
              <p className="text-xs text-muted-foreground">
                No login · Local-first · Your own isolated example
              </p>
            </div>
          </div>
        </section>
        <section className="space-y-6 border-b px-5 py-10 md:px-16 md:py-14">
          <Kicker>02 / A schedule you can read</Kicker>
          <h2>One delayed start. A visible chain.</h2>
          <p>
            Corporate Product Launch · 15 Oct 2026 · Asia/Jakarta. Power begins
            at 12:00 instead of 08:00. The original schedule stays intact.
          </p>
          <div className="hidden md:block">
            <Schedule mode="incident" compact />
          </div>
          <Panel className="md:hidden">
            <Status tone="danger">Deadline breach · 120 min</Status>
            <p className="text-[40px] font-semibold tracking-tight">
              17:00 → 19:00
            </p>
            <p className="font-mono text-sm">
              Power 12–14 → Audio + Lighting 14–16 → Testing 16–17 → Rehearsal
              17–19 → Doors 19:00
            </p>
            <p className="text-xs text-muted-foreground">
              Fictional, deterministic example. Baseline Doors Open: 17:00.
            </p>
          </Panel>
        </section>
        <section
          id="why"
          className="space-y-6 border-b px-5 py-10 md:px-16 md:py-14"
        >
          <Kicker>03 / The problem is not the first delay</Kicker>
          <h2>The next call needs more than a revised arrival time.</h2>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              [
                "Hidden knock-on effects",
                "Which activities move, and which are buffered by slack?",
              ],
              [
                "Unequal alternatives",
                "How much time returns, what might it cost, and who must confirm?",
              ],
              [
                "A decision without its context",
                "Can the meeting brief retain the assumptions behind the proposal?",
              ],
            ].map(([title, copy]) => (
              <Panel key={title}>
                <h3>{title}</h3>
                <p>{copy}</p>
              </Panel>
            ))}
          </div>
        </section>
        <section
          id="workflow"
          className="space-y-6 border-b px-5 py-10 md:px-16 md:py-14"
        >
          <Kicker>04 / From understanding to a proposal</Kicker>
          <h2>Four steps. One baseline.</h2>
          <ol className="grid gap-6 md:grid-cols-4">
            {[
              [
                "Understand",
                "Build the activity list and inspect finish-to-start relationships.",
              ],
              [
                "Disrupt",
                "Change one start constraint and trace the downstream effects.",
              ],
              [
                "Compare",
                "Set conditional start or duration changes side by side.",
              ],
              [
                "Brief",
                "Freeze the proposal, costs, warnings, and next actions.",
              ],
            ].map(([title, copy], i) => (
              <li key={title} className="space-y-3">
                <Kicker>0{i + 1}</Kicker>
                <div className="border-t" />
                <h3>{title}</h3>
                <p>{copy}</p>
              </li>
            ))}
          </ol>
        </section>
        <section className="space-y-6 bg-night px-5 py-10 text-background md:px-16 md:py-14">
          <Kicker className="text-secondary">
            05 / Clear boundaries build trust
          </Kicker>
          <h2>A sandbox, not an instruction to proceed.</h2>
          <p className="text-lg">
            The baseline is immutable in scenarios. Missing costs stay unknown.
            Protected testing stays protected. A preferred option is a proposal,
            never an automatic approval.
          </p>
          <p className="text-sm text-secondary">
            Deterministic finish-to-start propagation, transparent user-entered
            assumptions, and recorded approval status. No generated
            recommendations, vendor availability checks, live collaboration, or
            safety certification.
          </p>
        </section>
        <section className="space-y-6 border-b px-5 py-10 md:px-16 md:py-14">
          <Kicker>06 / Made for the people holding the run sheet</Kicker>
          <h2>
            Production managers. Technical directors. One shared explanation.
          </h2>
          <p className="text-lg">
            For small and medium production teams preparing corporate launches,
            conferences, exhibitions, and technically interdependent events. Use
            EventFuse alongside the tools you already use—as a companion to your
            event management platform.
          </p>
          <p className="text-xs text-muted-foreground">
            Designed around production decision-making hypotheses. No customer
            adoption or performance claims are made.
          </p>
        </section>
        <section className="space-y-6 border-b px-5 py-10 md:px-16 md:py-14">
          <Kicker>07 / Try the exact example</Kicker>
          <h2>Four hours late. Two responses to discuss.</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {(["a", "b"] as const).map((id) => (
              <Panel key={id}>
                <Kicker>
                  {id} / {recoverySamples[id].title}
                </Kicker>
                <h3 className="text-[40px]">
                  Doors {recoverySamples[id].time}
                </h3>
                <p>
                  {recoverySamples[id].change} Recovers{" "}
                  {recoverySamples[id].recovered} min versus the incident.
                </p>
                <p className="text-sm text-muted-foreground">
                  Additional cost: Not entered.
                </p>
                <Status tone="warning">{recoverySamples[id].approval}</Status>
              </Panel>
            ))}
          </div>
        </section>
        <section className="space-y-6 px-5 py-10 md:px-16 md:py-14">
          <Kicker>08 / Prepare the next conversation</Kicker>
          <h2>Test the disruption. Keep the context.</h2>
          <p>
            Explore the fictional Corporate Product Launch and its Power delay.
          </p>
          <LinkButton to="workspace">
            Open demo · no account required
          </LinkButton>
          <div className="mt-10 flex flex-col justify-between gap-5 border-t pt-6 md:flex-row">
            <p className="text-xl font-bold">EventFuse</p>
            <p className="max-w-[720px] text-xs text-muted-foreground">
              Local-first browser MVP · Fictional data only. This Phase 3A
              visual preview is not a live simulation. No guarantee of readiness
              or authorization to proceed.{" "}
              <ArrowUpRight className="inline size-3" aria-hidden="true" />
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
