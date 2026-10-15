import type { BaselineSnapshot, ScenarioResult } from "@/engine";
import { eventTime } from "@/presentation/app/time";
import { Status } from "@/presentation/shared";
import { motion, useReducedMotion } from "motion/react";
export function MilestoneMetrics({
  baseline,
  result,
}: {
  baseline: BaselineSnapshot;
  result: ScenarioResult | null;
}) {
  const reduced = useReducedMotion();
  if (!result) return null;
  return (
    <motion.section
      key={`${result.scenarioId}:${JSON.stringify(result.activityTimings)}`}
      initial={reduced ? false : { opacity: 0.7 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduced ? 0 : 0.14 }}
      aria-label="Critical milestone results"
      className="grid gap-4"
    >
      {result.milestoneImpacts.map((impact) => (
        <div
          key={impact.milestoneId}
          className="min-w-0 space-y-3 border-y py-5"
          data-milestone={impact.milestoneId}
        >
          <h3>
            {baseline.milestones.find((m) => m.id === impact.milestoneId)
              ?.label ?? impact.milestoneId}
          </h3>
          <p className="text-[2.5rem] font-semibold leading-tight tracking-tight">
            {eventTime(baseline.event, impact.finishMinute)}
          </p>
          <p className="text-sm">
            Baseline {eventTime(baseline.event, impact.baselineFinishMinute)} ·
            Deadline {eventTime(baseline.event, impact.deadlineMinute)}
          </p>
          <Status tone={impact.breachMinutes ? "danger" : "success"}>
            {impact.breachMinutes
              ? `Deadline breach +${impact.breachMinutes} min`
              : "On target · conditional"}
          </Status>
          <p className="font-mono text-xs">
            Delay vs baseline {impact.delayFromBaselineMinutes > 0 ? "+" : ""}
            {impact.delayFromBaselineMinutes} min
            {impact.recoveredMinutes !== null &&
              ` · Recovered vs incident ${impact.recoveredMinutes} min`}
          </p>
        </div>
      ))}
    </motion.section>
  );
}
