import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { RecoveryOption, ScenarioResult } from "@/engine";
import { Button } from "@/components/ui/button";
import {
  Heading,
  Kicker,
  LinkButton,
  Notice,
  Panel,
  Status,
} from "@/presentation/shared";
import { Confirm, Errors } from "@/presentation/forms";
import { RecoveryEditor } from "@/presentation/RecoveryEditor";
import { Schedule } from "@/presentation/Schedule";
import { MilestoneMetrics } from "@/presentation/MilestoneMetrics";
import { useLive } from "@/presentation/app/live";
import { moneyLabel, ordinalId } from "@/presentation/app/format";
import { demoOptionA, demoOptionB } from "@/demo/fixtures";

function RecoveryCard({
  option,
  index,
  result,
  draft,
}: {
  option: RecoveryOption;
  index: number;
  result: ScenarioResult | null;
  draft: boolean;
}) {
  const { state, view, dispatch } = useLive(),
    incidentId = state.document!.activeIncidentId!;
  const [expanded, setExpanded] = useState(false),
    reduced = useReducedMotion();
  const selected = view.selected?.id === option.id,
    letter = ordinalId(index);
  return (
    <Panel className={selected ? "border-2 border-primary" : ""}>
      <Kicker>
        Option {letter} /{" "}
        {selected
          ? "preferred proposal"
          : draft
            ? "unapplied draft"
            : "alternative"}
      </Kicker>
      <h2>{option.name}</h2>
      <Status
        tone={option.approvalStatus === "pending" ? "warning" : "neutral"}
      >
        Hypothetical · approval {option.approvalStatus.replace("_", " ")}
      </Status>
      <MilestoneMetrics baseline={view.activeBaseline!} result={result} />
      {!result && (
        <p role="status" className="text-sm">
          {draft
            ? "Apply this option draft, then Compare to calculate its result."
            : "Compare current applied options to see this result."}
        </p>
      )}
      <p>{option.description}</p>
      <p className="font-semibold">
        Additional cost: {moneyLabel(option.costMinorUnits, option.currency)}
      </p>
      {option.approvalContext && (
        <p className="text-sm">
          External approval context: {option.approvalContext}
        </p>
      )}
      {option.approvalRequirements?.map((r, i) => (
        <p key={i} className="text-sm">
          {r.approverLabel}: {r.condition}
        </p>
      ))}
      <ul className="space-y-2 text-sm">
        {option.modifications.map((m) => (
          <li key={`${m.activityId}:${m.field}`}>
            {
              view.activeBaseline!.activities.find((a) => a.id === m.activityId)
                ?.name
            }{" "}
            · {m.field.replace("_", " ")} · {m.operation} {m.valueMinutes}{" "}
            elapsed min
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-3">
        <RecoveryEditor option={option} />
        {draft && (
          <Button
            className="min-h-11"
            onClick={() =>
              dispatch({
                type: "recovery.apply",
                expectedIncidentId: incidentId,
                id: option.id,
              })
            }
          >
            Apply option {letter}
          </Button>
        )}
        <Confirm
          label="Delete option"
          action={() => {
            dispatch({
              type: "recovery.remove",
              expectedIncidentId: incidentId,
              id: option.id,
            });
          }}
        >
          Delete this option and clear its preference? Prepared briefs retain
          their frozen snapshots.
        </Confirm>
      </div>
      <Button
        variant="outline"
        className="min-h-11 h-auto w-full whitespace-normal py-3"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls={`option-detail-${letter.toLowerCase()}`}
      >
        {expanded ? "Hide" : "View"} {letter} timings & assumptions
      </Button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={`option-detail-${letter.toLowerCase()}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.15 }}
            className="space-y-4"
          >
            <Schedule
              baseline={view.activeBaseline!}
              result={result}
              reference={view.baselineResult}
            />
            {option.assumptionNotes.map((note, i) => (
              <p key={i} className="text-sm">
                {note}
              </p>
            ))}
            {result && (
              <>
                <p className="text-sm">
                  {result.shiftedActivityIds.length} shifted activities vs
                  baseline. Of {result.incidentDescendantIds.length} downstream
                  activities, {result.downstreamAffectedActivityIds.length} have
                  incident-caused start changes.
                </p>
                <ul className="space-y-2 text-sm">
                  {result.validationWarnings.map((warning, i) => (
                    <li key={i}>
                      <strong>{warning.code}</strong>: {warning.message}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <Notice title="A preference is a proposal">
        Selection does not authorize work; pending approvals remain outstanding.
        Review the recorded assumptions and external confirmations.
      </Notice>
      <Button
        variant={selected ? "default" : "outline"}
        className="min-h-12 h-auto w-full whitespace-normal py-3"
        disabled={!result}
        aria-pressed={selected}
        onClick={() =>
          dispatch({
            type: "selection.set",
            expectedIncidentId: incidentId,
            id: option.id,
          })
        }
      >
        {selected
          ? "✓ Preferred proposal · not authorized"
          : "Mark as preferred proposal"}
      </Button>
    </Panel>
  );
}
export function Compare() {
  const reduced = useReducedMotion();
  const { controller, state, view, dispatch } = useLive(),
    document = state.document!,
    incidentId = document.activeIncidentId;
  const active = Object.values(document.recoveryOptions).filter(
    (o) => o.incidentId === incidentId,
  );
  const options = new Map(active.map((o) => [o.id, o]));
  for (const option of Object.values(state.editing!.recoveries))
    options.set(option.id, option);
  const canEdit =
    !!incidentId &&
    !view.baselineDirty &&
    !view.incidentDirty &&
    view.appliedIncident!.startDelayMinutes > 0;
  const addCanonical = () => {
    if (!incidentId) return;
    for (const source of [demoOptionA, demoOptionB]) {
      const before = new Set(
        Object.keys(controller.getSnapshot().editing!.recoveries),
      );
      const added = dispatch({
        type: "recovery.add",
        expectedIncidentId: incidentId,
        option: {
          name: source.name,
          description: source.description,
          currency: source.currency,
          costMinorUnits: source.costMinorUnits,
          modifications: source.modifications,
          approvalStatus: source.approvalStatus,
          approvalRequirements: source.approvalRequirements,
          approvalContext: source.approvalContext,
          assumptionNotes: source.assumptionNotes,
        },
      });
      if (!added.ok) return;
      const id = Object.keys(controller.getSnapshot().editing!.recoveries).find(
        (id) => !before.has(id),
      )!;
      if (
        !dispatch({
          type: "recovery.apply",
          expectedIncidentId: incidentId,
          id,
        }).ok
      )
        return;
    }
    dispatch({ type: "recovery.compare", expectedIncidentId: incidentId });
  };
  return (
    <>
      <Heading eyebrow={`Recovery Compare / ${view.event!.name}`}>
        Compare responses. Keep the conditions.
      </Heading>
      {view.activeBaseline && (
        <div className="grid gap-6 bg-foreground p-5 text-background md:grid-cols-2 md:p-7">
          <section>
            <Kicker className="text-secondary">
              Fixed reference / {view.activeBaseline.baselineVersion}
            </Kicker>
            <MilestoneMetrics
              baseline={view.activeBaseline}
              result={view.baselineResult}
            />
          </section>
          <section>
            <Kicker className="text-danger-soft">
              Unmitigated incident /{" "}
              {view.appliedIncident?.title ?? "Apply an incident first"}
            </Kicker>
            <MilestoneMetrics
              baseline={view.activeBaseline}
              result={view.impact}
            />
          </section>
        </div>
      )}
      <p>
        Independent hypothetical alternatives. Each result reports every
        critical milestone. No option is ranked safest or optimal. Unknown costs
        are excluded from monetary comparisons.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <RecoveryEditor disabled={!canEdit || options.size >= 3} />
        <Button
          className="min-h-12"
          disabled={!view.actions.compare}
          onClick={() => {
            if (incidentId)
              dispatch({
                type: "recovery.compare",
                expectedIncidentId: incidentId,
              });
          }}
        >
          Compare applied options
        </Button>
        <span className="text-sm">{options.size} of 3 slots used</span>
        {controller.namespace === "demo" && canEdit && !options.size && (
          <Button variant="outline" className="min-h-12" onClick={addCanonical}>
            Add canonical demo alternatives
          </Button>
        )}
      </div>
      {!canEdit && (
        <Notice title="Apply current source inputs first">
          Apply a valid baseline and a nonzero incident before adding
          alternatives. Resetting an incident clears its active options and
          preference.
        </Notice>
      )}
      <div className="grid items-start gap-6 md:grid-cols-2">
        {[...options.values()].map((option, index) => {
          const alternative = view.optionResults.find(
            (r) => r.recoveryOptionId === option.id,
          );
          return (
            <div key={option.id} className="min-w-0 space-y-3">
              <RecoveryCard
                option={option}
                index={index}
                draft={!!state.editing!.recoveries[option.id]}
                result={
                  alternative?.result.ok ? alternative.result.value : null
                }
              />
              {alternative && !alternative.result.ok && (
                <Errors
                  message={alternative.result.errors
                    .map((error) => `${error.code}: ${error.message}`)
                    .join(" ")}
                />
              )}
            </div>
          );
        })}
      </div>
      <Notice title="Unknown cost travels with the proposal" tone="warning">
        Not entered is unknown, including when a schedule can be calculated. A
        pending approval remains pending until you record external confirmation.
        Both conditions stay in the brief and print output.
      </Notice>
      <div className="flex flex-wrap gap-4">
        {view.briefReady ? (
          <LinkButton to="brief">Prepare decision brief</LinkButton>
        ) : (
          <Button disabled className="min-h-12 h-auto whitespace-normal py-3">
            Select a proposal to prepare its brief
          </Button>
        )}
        {view.selected && (
          <Button
            variant="outline"
            className="min-h-12"
            onClick={() =>
              dispatch({
                type: "selection.clear",
                expectedIncidentId: incidentId!,
              })
            }
          >
            Clear preference
          </Button>
        )}
      </div>
      <motion.p
        key={view.selected?.id ?? "no-preference"}
        initial={reduced ? false : { opacity: 0.7 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduced ? 0 : 0.12 }}
        role="status"
        aria-live="polite"
        className="text-sm text-muted-foreground"
      >
        {view.selected
          ? `${view.selected.name} preferred. Approval remains ${view.selected.approvalStatus.replace("_", " ")}. Save explicitly to preserve this preference.`
          : "No proposal preferred. Nothing is selected automatically."}
      </motion.p>
    </>
  );
}
