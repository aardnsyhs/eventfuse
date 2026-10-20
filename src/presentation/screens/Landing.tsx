import { ArrowUpRight } from "lucide-react";
import { Kicker, Panel, Status } from "@/presentation/shared";
import { DemoEntry } from "@/presentation/DemoEntry";
import { Schedule } from "@/presentation/Schedule";
import { referenceDemo } from "@/demo/reference";
import { demoOptionA, demoOptionB } from "@/demo/fixtures";
import { MilestoneMetrics } from "@/presentation/MilestoneMetrics";
import { eventTime } from "@/presentation/app/time";
import { moneyLabel } from "@/presentation/app/format";
import { AppHeader } from "@/presentation/app/Navbar";

export function Landing() {
  const baseline = referenceDemo.activeBaseline!,
    impact = referenceDemo.impact!;
  return (
    <>
      <AppHeader mode="landing" screen="landing" />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-[1600px] outline-none"
      >
        <section className="space-y-7 border-b px-5 py-14 md:px-16 md:py-20">
          <Kicker>01 / Contingency intelligence for event production</Kicker>
          <h1
            tabIndex={-1}
            className="max-w-[1100px] text-5xl leading-[1.08] font-semibold tracking-[-1.5px] outline-none md:text-[5rem]"
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
              <DemoEntry className="w-full sm:w-auto">
                Open the fictional demo
              </DemoEntry>
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
            {baseline.event.name} · {baseline.event.date} ·{" "}
            {baseline.event.timezone}. Power begins at{" "}
            {eventTime(
              baseline.event,
              impact.activityTimings.power.startMinute,
            )}{" "}
            instead of{" "}
            {eventTime(
              baseline.event,
              referenceDemo.baselineResult!.activityTimings.power.startMinute,
            )}
            . The original schedule stays intact.
          </p>
          <div className="hidden md:block">
            <Schedule
              baseline={baseline}
              result={impact}
              reference={referenceDemo.baselineResult}
              compact
            />
          </div>
          <Panel className="md:hidden">
            <MilestoneMetrics baseline={baseline} result={impact} />
            <p className="text-xs text-muted-foreground">
              Fictional, deterministic example calculated from canonical demo
              inputs.
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
            EventFuse alongside your event management platform.
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
            {referenceDemo.optionResults.map((alternative, index) => {
              if (!alternative.result.ok) return null;
              const result = alternative.result.value,
                source = [demoOptionA, demoOptionB][index];
              return (
                <Panel key={alternative.recoveryOptionId}>
                  <Kicker>
                    {String.fromCharCode(65 + index)} / {source.name}
                  </Kicker>
                  <MilestoneMetrics baseline={baseline} result={result} />
                  <p>{source.description}</p>
                  <p className="text-sm text-muted-foreground">
                    Additional cost:{" "}
                    {moneyLabel(result.recoveryCostMinorUnits, result.currency)}
                    .
                  </p>
                  <Status tone="warning">
                    Approval {result.approvalStatus}
                  </Status>
                </Panel>
              );
            })}
          </div>
        </section>
        <section className="space-y-6 px-5 py-10 md:px-16 md:py-14">
          <Kicker>08 / Prepare the next conversation</Kicker>
          <h2>Test the disruption. Keep the context.</h2>
          <p>
            Explore the fictional Corporate Product Launch and its Power delay.
          </p>
          <DemoEntry>Open demo · no account required</DemoEntry>
          <div className="mt-10 flex flex-col justify-between gap-5 border-t pt-6 md:flex-row">
            <p className="text-xl font-bold">EventFuse</p>
            <p className="max-w-[720px] text-xs text-muted-foreground">
              Local-first browser MVP · This page shows the canonical fictional
              example. Open the workspace to edit and simulate. No guarantee of
              readiness or authorization to proceed.{" "}
              <ArrowUpRight className="inline size-3" aria-hidden="true" />
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
