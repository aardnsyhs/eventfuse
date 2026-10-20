import { Diamond, Shield } from "lucide-react";
import type { ReactNode } from "react";
import type { Activity, BaselineSnapshot, ScenarioResult } from "@/engine";
import { Kicker, Notice } from "@/presentation/shared";
import { eventTime, formatLocalTime } from "@/presentation/app/time";
import {
  barGeometry,
  DEFAULT_VISIBLE_MINUTES,
} from "@/presentation/app/geometry";
export function Schedule({
  baseline,
  result,
  reference,
  compact = false,
  editAction,
}: {
  baseline: BaselineSnapshot;
  result: ScenarioResult | null;
  reference?: ScenarioResult | null;
  compact?: boolean;
  editAction?: (activity: Activity) => ReactNode;
}) {
  if (!result)
    return (
      <Notice title="Schedule awaiting current inputs">
        Validate and apply the baseline, incident and option drafts before using
        current timings. Previous results are withheld while their source is
        dirty or invalid.
      </Notice>
    );
  const horizon = Math.max(
    DEFAULT_VISIBLE_MINUTES,
    ...Object.values(result.activityTimings).map((t) => t.finishMinute),
    ...Object.values(reference?.activityTimings ?? {}).map(
      (t) => t.finishMinute,
    ),
    ...baseline.milestones.map((m) => m.deadlineMinute),
  );
  const event = baseline.event,
    time = (minute: number) => eventTime(event, minute);
  const tickStep = Math.ceil(horizon / 60 / 11) * 60;
  const ticks = Array.from(
    { length: Math.floor(horizon / tickStep) + 1 },
    (_, index) => index * tickStep,
  );
  return (
    <section
      aria-label={
        result.kind === "baseline"
          ? "Baseline activity schedule"
          : "Baseline compared with scenario"
      }
      className={compact ? "border bg-card p-4 md:p-6" : ""}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">
          {baseline.baselineVersion} · {baseline.activities.length} activities ·{" "}
          {result.kind}
        </p>
        <Kicker>
          {event.timezone} / elapsed scale {time(0)} to {time(horizon)}
        </Kicker>
      </div>
      <div
        aria-hidden="true"
        className="hidden xl:grid xl:grid-cols-[minmax(180px,1fr)_minmax(260px,2fr)_minmax(150px,1fr)]"
      >
        <span />
        <div className="relative mx-1 h-6 font-mono text-[0.6875rem]">
          {ticks.map((minute) => (
            <span
              key={minute}
              className="absolute -translate-x-1/2 whitespace-nowrap"
              style={{ left: `${(minute / horizon) * 100}%` }}
            >
              {formatLocalTime(
                event.timezone,
                event.referenceInstant,
                minute,
              ).slice(0, 2)}
            </span>
          ))}
        </div>
        <span />
      </div>
      <ul>
        {baseline.activities.map((activity) => {
          const timing = result.activityTimings[activity.id],
            original = reference?.activityTimings[activity.id];
          if (!timing) return null;
          const delta = result.activityDeltas.find(
            (d) => d.activityId === activity.id,
          );
          return (
            <li
              key={activity.id}
              data-activity={activity.id}
              className="grid gap-3 border-b py-4 md:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_minmax(260px,2fr)_minmax(150px,1fr)] xl:items-center"
            >
              <div className="flex justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    {activity.classification === "protected" && (
                      <Shield
                        className="size-3 shrink-0"
                        aria-label="Protected"
                      />
                    )}
                    {activity.isMilestone && (
                      <Diamond className="size-3 shrink-0" aria-hidden="true" />
                    )}
                    {activity.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {activity.ownerName || "Owner not entered"} ·{" "}
                    {timing.finishMinute - timing.startMinute} min ·{" "}
                    {activity.classification}
                  </p>
                </div>
                {editAction?.(activity)}
              </div>
              <div
                className="hidden h-12 min-w-0 px-1 xl:block"
                aria-hidden="true"
              >
                <div
                  className="relative h-full border-x border-muted-foreground/50"
                  data-timeline-track
                >
                  {ticks.map((minute) => (
                    <span
                      key={minute}
                      className="absolute inset-y-0 w-px bg-border"
                      style={{ left: `${(minute / horizon) * 100}%` }}
                    />
                  ))}
                  {baseline.milestones.map((m) => (
                    <span
                      key={m.id}
                      className="absolute inset-y-0 w-px bg-destructive"
                      style={{ left: `${(m.deadlineMinute / horizon) * 100}%` }}
                    />
                  ))}
                  {original && (
                    <span
                      data-baseline-bar
                      className="absolute top-1 h-3 border border-muted-foreground bg-baseline-fill"
                      style={barGeometry(
                        original.startMinute,
                        original.finishMinute,
                        horizon,
                      )}
                    />
                  )}
                  {activity.isMilestone ? (
                    <span
                      data-milestone-marker
                      className={`absolute top-6 -translate-x-1/2 font-mono ${result.kind === "incident" ? "text-destructive" : "text-primary"}`}
                      style={{
                        left: `${(timing.finishMinute / horizon) * 100}%`,
                      }}
                    >
                      ◆
                    </span>
                  ) : (
                    <span
                      data-scenario-bar
                      className={`absolute top-6 h-4 ${result.kind === "baseline" ? "border border-muted-foreground bg-baseline-fill" : result.kind === "incident" ? "bg-destructive" : "bg-primary"}`}
                      style={barGeometry(
                        timing.startMinute,
                        timing.finishMinute,
                        horizon,
                      )}
                    />
                  )}
                </div>
              </div>
              <div className="space-y-1 font-mono text-sm">
                <p className="font-semibold">
                  {time(timing.startMinute)}
                  {timing.finishMinute !== timing.startMinute
                    ? `–${time(timing.finishMinute)}`
                    : ""}
                </p>
                {original && (
                  <p className="text-xs text-muted-foreground">
                    Base {time(original.startMinute)}–
                    {time(original.finishMinute)} · finish{" "}
                    {delta && delta.finishDeltaMinutes > 0 ? "+" : ""}
                    {delta?.finishDeltaMinutes ?? 0} min
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-xs text-muted-foreground">
        Outline = baseline · Solid = current scenario · ◆ zero-duration
        milestone · Red rules = individual critical deadlines. Dates appear when
        a time crosses the event date.
      </p>
    </section>
  );
}
