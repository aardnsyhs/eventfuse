import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Heading, Kicker, Notice, Status } from "@/presentation/shared";
import {
  activities,
  recoverySamples,
  eventSample,
} from "@/presentation/sample";
import type { OptionId } from "@/presentation/sample";

export function Brief({ optionId }: { optionId: OptionId | null }) {
  const id = optionId ?? "a",
    option = recoverySamples[id];
  return (
    <>
      <Heading eyebrow="Decision Brief / frozen example snapshot">
        A proposal for the production meeting.
      </Heading>
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <Button disabled className="min-h-11">
          Copy brief
        </Button>
        <Button variant="outline" disabled className="min-h-11">
          Print / save PDF
        </Button>
        <Status tone="warning">Proposed · not authorized</Status>
      </div>
      <p className="text-sm text-muted-foreground">
        Illustrative snapshot {id.toUpperCase()}.{" "}
        {optionId === null
          ? "No current proposal is selected; this reference example does not create a preference."
          : "Your preview preference is not an applied or saved decision."}{" "}
        Brief generation, copy and print connect in Phase 3B.
      </p>
      <article
        aria-label="Illustrative decision brief"
        className="space-y-7 border border-t-4 border-t-foreground bg-card p-5 md:p-10"
      >
        <Kicker>EventFuse / decision record / EF-CPL-{id.toUpperCase()}</Kicker>
        <h2 className="text-[32px] md:text-5xl">{eventSample.name}</h2>
        <p className="font-mono text-xs">
          15 Oct 2026 · Asia/Jakarta · local time
          <br />
          Baseline v1 · production reference 08:00 · deadline 17:00
        </p>
        <Notice title="Cost unknown · external approval pending" tone="warning">
          Additional cost: Not entered. {option.approval}. This snapshot is not
          approval, an availability guarantee, or evidence of safe readiness.
        </Notice>
        <dl className="grid gap-6 md:grid-cols-3">
          {[
            ["Baseline Doors Open", "17:00"],
            ["Unmitigated · 120 min breach", "19:00"],
            [`Proposal ${id.toUpperCase()} · conditional`, option.time],
          ].map(([label, value]) => (
            <div key={label} className="space-y-2">
              <dt className="font-mono text-xs text-muted-foreground">
                {label}
              </dt>
              <dd className="text-[48px] leading-tight font-semibold tracking-[-1.5px]">
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <Separator />
        <div className="grid gap-6 md:grid-cols-2">
          <section className="space-y-3">
            <Kicker>01 / Incident</Kicker>
            <p>
              Power Installation begins 240 min late: 12:00 instead of its
              calculated baseline start of 08:00. Without mitigation, Doors Open
              moves to 19:00; all 6 activities shift, including the milestone.
            </p>
          </section>
          <section className="space-y-3">
            <Kicker>02 / Preferred proposal {id.toUpperCase()}</Kicker>
            <p>
              {option.title}: {option.change} Recovers {option.recovered} min
              versus the incident.{" "}
              {option.breach
                ? "A 60-minute deadline breach remains."
                : "No remaining deadline breach if the assumption holds."}
            </p>
          </section>
        </div>
        <h3>
          {option.shifted === 5 ? "Five" : "Six"} activities remain shifted from
          baseline
        </h3>
        <p className="text-sm text-muted-foreground">
          {option.shifted} shifted activities / 6 total. Of 5 downstream
          activities, {option.downstreamShifted} shift.{" "}
          {id === "a" &&
            "Doors Open remains 17:00 and is not counted as shifted."}
        </p>
        <dl>
          {activities.map((a) => (
            <div
              key={a.id}
              className="grid gap-2 border-b py-5 text-sm sm:grid-cols-[1fr_1.5fr]"
            >
              <dt className="font-semibold">{a.name}</dt>
              <dd className="font-mono text-xs">
                {a.baseline} → {a[id]}
                {a.baseline === a[id] && " / unchanged"}
              </dd>
            </div>
          ))}
        </dl>
        <div className="grid gap-6 md:grid-cols-2">
          <section className="space-y-3">
            <Kicker>03 / Assumptions & constraints</Kicker>
            <p>
              {option.condition} Additional cost remains unknown.
              Finish-to-start, zero lag; no resource-capacity or
              vendor-availability model. System Testing is protected and
              unchanged at 60 min. Rehearsal is unchanged at 120 min.
            </p>
            <p>
              The other option remains an alternative, with its own pending
              confirmations. No option is ranked safest or optimal.
            </p>
          </section>
          <section className="space-y-3">
            <Kicker>04 / Before any operational decision</Kicker>
            <ul className="space-y-3 text-sm">
              {[
                "Obtain the required external confirmations",
                "Enter the approved cost and currency",
                "Review production assumptions",
                "Record vendor confirmation / approval status",
              ].map((text) => (
                <li key={text}>□ {text}</li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Illustrative checklist, not recorded completion.
            </p>
          </section>
        </div>
        <Separator />
        <p className="text-xs text-muted-foreground">
          Frozen DecisionBrief example · Fictional data. Later edits must not
          silently change a saved snapshot. Unknown cost, assumptions, approval
          warnings and hypothetical status remain in copy and print.
        </p>
      </article>
      <Notice
        title="Hypothetical simulation. Operational validation is required."
        tone="warning"
      >
        Selection does not authorize work; pending approvals remain outstanding.
      </Notice>
    </>
  );
}
