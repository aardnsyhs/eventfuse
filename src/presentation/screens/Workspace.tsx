import { Button } from "@/components/ui/button";
import {
  Heading,
  Kicker,
  LinkButton,
  Notice,
  Panel,
  Status,
} from "@/presentation/shared";
import { eventSample } from "@/presentation/sample";

export function Workspace() {
  return (
    <>
      <Heading eyebrow="Workspace / technical setup before doors">
        {eventSample.name}
      </Heading>
      <Notice title="Your own fictional workspace" tone="success">
        Explore the sample screens. Baseline v1 stays intact. These example
        states are not saved to your browser in this visual preview.
      </Notice>
      <dl className="grid gap-5 md:grid-cols-3">
        {[
          ["Production reference", "08:00"],
          ["Doors Open deadline", "17:00"],
          ["Including 1 milestone", "6 activities"],
        ].map(([label, value]) => (
          <div key={label} className="space-y-2 border-y py-4">
            <dt className="font-mono text-xs tracking-wide text-muted-foreground">
              {label}
            </dt>
            <dd className="text-[40px] font-semibold leading-tight tracking-[-1.5px] md:text-5xl">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-6 md:grid-cols-[1.6fr_1fr]">
        <Panel>
          <Status tone="success">Baseline v1 · on deadline</Status>
          <h2>A plan to understand before changing it.</h2>
          <p>
            Power feeds Audio and Lighting in parallel. System Testing waits for
            both. Rehearsal follows, then Doors Open at 17:00.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {["08:00 / Power", "13:00 / Testing", "17:00 / Doors"].map((t) => (
              <p key={t} className="border p-4 font-mono text-sm">
                {t}
              </p>
            ))}
          </div>
          <LinkButton to="blueprint" secondary>
            Open Blueprint · view all 6 activities
          </LinkButton>
          <p className="text-xs text-muted-foreground">
            Baseline readiness is schedule alignment only. It is not certified
            safety or a guarantee of operational readiness.
          </p>
        </Panel>
        <Panel>
          <Kicker>Start here</Kicker>
          <h2>What if Power begins four hours late?</h2>
          <p>
            Trace the effect from 12:00 arrival to a 19:00 Doors Open milestone.
          </p>
          <LinkButton to="scenario">Explore Power delay</LinkButton>
          <p className="text-xs text-muted-foreground">
            Baseline v1 stays unchanged.
          </p>
        </Panel>
      </div>
      <section className="space-y-5">
        <h2>Scenarios in this workspace</h2>
        {[
          ["Power delay / +240 min", "19:00 · 120 min breach", "danger"],
          ["No deadline impact / +60 min", "17:00 · no breach", "success"],
        ].map(([title, outcome, tone]) => (
          <div
            key={title}
            className="flex flex-col gap-4 border bg-card p-5 md:flex-row md:items-center md:justify-between"
          >
            <h3 className="text-base">{title}</h3>
            <Status tone={tone as "danger" | "success"}>{outcome}</Status>
            {tone === "danger" ? (
              <LinkButton to="scenario" secondary>
                Open scenario
              </LinkButton>
            ) : (
              <p className="text-xs text-muted-foreground">
                Additional example · wiring in Phase 3B
              </p>
            )}
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="outline" disabled className="min-h-11">
            + Create local event
          </Button>
          <p className="text-xs text-muted-foreground">
            Event creation and browser persistence will be connected in Phase
            3B.
          </p>
        </div>
      </section>
    </>
  );
}
