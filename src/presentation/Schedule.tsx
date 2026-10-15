import { Diamond, Shield } from "lucide-react";
import type { ReactNode } from "react";
import type { SampleActivity } from "@/presentation/sample";
import { activities } from "@/presentation/sample";
import { Kicker } from "@/presentation/shared";

const bars = {
  baseline: [
    "70599.svg",
    "018da.svg",
    "018da.svg",
    "6bfd4.svg",
    "a0186.svg",
    "b29e0.svg",
  ],
  incident: [
    "7dd30.svg",
    "c9e9e.svg",
    "c9e9e.svg",
    "d47a3.svg",
    "edb61.svg",
    "aaf96.svg",
  ],
};
export function Schedule({
  mode = "baseline",
  compact = false,
  editAction,
}: {
  mode?: "baseline" | "incident";
  compact?: boolean;
  editAction?: (activity: SampleActivity) => ReactNode;
}) {
  return (
    <section
      aria-label={
        mode === "baseline"
          ? "Baseline activity schedule"
          : "Baseline compared with incident"
      }
      className={compact ? "border bg-card p-4 md:p-6" : ""}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">
          Baseline v1 {mode === "incident" ? "/ scenario" : "· 6 activities"}
        </p>
        <Kicker className="hidden md:block">
          08:00 → 19:00 / deadline 17:00
        </Kicker>
      </div>
      <div className="hidden xl:grid xl:grid-cols-[minmax(180px,1fr)_652px_minmax(160px,1fr)]">
        <span />
        <div
          className="flex justify-between font-mono text-[11px]"
          aria-hidden="true"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i}>{String(i + 8).padStart(2, "0")}</span>
          ))}
        </div>
        <span />
      </div>
      <ul>
        {activities.map((activity, i) => (
          <li
            key={activity.id}
            className="grid gap-3 border-b py-4 md:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_652px_minmax(160px,1fr)] xl:items-center"
          >
            <div className="flex justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  {activity.classification === "protected" && (
                    <Shield className="size-3" aria-label="Protected" />
                  )}
                  {activity.id === "doors" && (
                    <Diamond className="size-3" aria-hidden="true" />
                  )}
                  {activity.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {activity.classification === "protected"
                    ? "Protected · 60 min · never shortened"
                    : activity.id === "doors"
                      ? "Milestone · deadline 17:00"
                      : `${activity.owner} · ${activity.duration} min`}
                </p>
                {editAction && (
                  <p className="text-xs text-muted-foreground md:hidden">
                    Earliest {activity.earliest} · after {activity.predecessors}{" "}
                    · lag 0 min
                  </p>
                )}
              </div>
              {editAction && (
                <div className="shrink-0 md:hidden">{editAction(activity)}</div>
              )}
            </div>
            <div className="timeline-track hidden xl:block" aria-hidden="true">
              <img
                src={`/design/schedules/${bars[mode][i]}`}
                width={652}
                height={mode === "baseline" ? 30 : 42}
                className="max-w-none"
                alt=""
              />
            </div>
            <div className="space-y-1 font-mono text-sm xl:pl-5">
              <p className="font-semibold">{activity[mode]}</p>
              {mode === "incident" && (
                <p className="text-xs text-muted-foreground">
                  Base {activity.baseline} / {activity.delta}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted-foreground">
        Outline = baseline · Solid = scenario · ◇ milestone · Protected Testing:
        60 min · Red rule = 17:00 deadline
      </p>
    </section>
  );
}
