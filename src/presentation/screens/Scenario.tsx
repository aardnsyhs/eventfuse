import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Heading,
  Kicker,
  LinkButton,
  Notice,
  Panel,
  PreviewField,
  Status,
} from "@/presentation/shared";
import { Schedule } from "@/presentation/Schedule";

export function Scenario() {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <Heading eyebrow="Scenario Lab / Corporate Product Launch">
        Four hours late. Two hours over.
      </Heading>
      <div className="grid gap-6 md:grid-cols-[minmax(250px,0.8fr)_2fr] md:items-start">
        <Panel className="order-2 md:order-1">
          <Kicker>01 / Disruption</Kicker>
          <PreviewField
            id="incident-activity"
            label="Activity"
            value="Power Installation"
          />
          <PreviewField
            id="incident-delay"
            label="Delay from calculated baseline start · minutes"
            value="240"
            hint="Whole minutes ≥ 0 · 240 min = 4 hours"
          />
          <p className="font-mono text-xs">
            Baseline 08:00 → 12:00 permitted start
          </p>
          <div className="flex gap-3">
            <Button disabled className="min-h-11">
              Apply delay
            </Button>
            <Button variant="outline" disabled className="min-h-11">
              Reset
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Visual example. Phase 3B connects Apply and confirmed Reset. Only
            the scenario changes; baseline v1 stays intact.
          </p>
        </Panel>
        <section
          className="order-1 space-y-5 border-l-4 border-destructive bg-danger-soft p-5 md:order-2 md:p-7"
          aria-label="Example incident impact"
        >
          <Kicker className="text-destructive">
            ! Deadline breach / +120 min
          </Kicker>
          <p className="text-[56px] leading-tight font-semibold tracking-[-1.5px] md:text-[72px]">
            19:00
          </p>
          <p className="font-semibold">Doors Open · deadline 17:00</p>
          <p>
            6 of 6 activities shift, including the milestone. 5 downstream
            activities are reachable, all 5 shift, and all 5 have
            incident-caused start changes.
          </p>
          <p className="font-mono text-xs">
            POWER +4h / AUDIO +4h / LIGHTING +4h
            <br />
            TESTING +3h / REHEARSAL +3h / DOORS +2h
          </p>
          <Status>Baseline v1 locked</Status>
        </section>
      </div>
      <div className="space-y-5">
        <h2>What changed / baseline beside scenario</h2>
        <Schedule mode="incident" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Panel>
          <Kicker>02 / Why these times</Kicker>
          <h3>A parallel split. A mandatory join.</h3>
          <p>
            Power → Audio AND Lighting → System Testing → Full Rehearsal → Doors
            Open.
          </p>
          <Button
            variant="outline"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-controls="causal-detail"
            className="min-h-11"
          >
            {expanded ? "Hide explanation" : "Explain shifted times"}
          </Button>
          {expanded && (
            <p id="causal-detail" className="text-sm">
              Power finishes 14:00. Both setups then run 14:00–16:00. Testing
              waits for both, runs 16:00–17:00, then the unchanged 120-minute
              rehearsal finishes at 19:00. These are dependency constraints, not
              a full critical-path calculation.
            </p>
          )}
        </Panel>
        <Panel>
          <Kicker>03 / What absorbed the delay</Kicker>
          <h3>Two hours of slack, not four.</h3>
          <p>
            One hour before Testing (12:00 → 13:00) and one hour before Doors
            (16:00 → 17:00) absorb two hours of the four-hour disruption. The
            remaining two hours breach the deadline.
          </p>
          <p className="text-sm font-semibold">
            Protected System Testing remains 60 min. Full Rehearsal remains 120
            min.
          </p>
        </Panel>
      </div>
      <Notice
        title="Assumptions are not availability confirmations"
        tone="warning"
      >
        Finish-to-start dependencies. Zero-minute lag, no resource-capacity
        model. All starts are local. This deterministic scenario does not verify
        supplier availability, revised work methods, or safety readiness.
      </Notice>
      <LinkButton to="compare">Compare recovery options</LinkButton>
    </>
  );
}
