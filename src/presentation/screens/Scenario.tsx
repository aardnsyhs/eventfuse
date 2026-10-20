import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Heading,
  Kicker,
  LinkButton,
  Notice,
  Panel,
  Status,
} from "@/presentation/shared";
import { Schedule } from "@/presentation/Schedule";
import { MilestoneMetrics } from "@/presentation/MilestoneMetrics";
import { Choice, Confirm, Errors, Field, TextArea } from "@/presentation/forms";
import { auditInstant, useLive, wholeMinute } from "@/presentation/app/live";
import { eventTime } from "@/presentation/app/time";
import { selectHistoricalIncident } from "@/application";
import { usePendingForm } from "@/presentation/app/usePendingForm";

function IncidentLab() {
  const { controller, state, view, dispatch } = useLive(),
    baseline = view.activeBaseline;
  const draft = state.editing!.incident;
  const [target, setTarget] = useState(
    draft?.targetActivityId ?? baseline?.activities[0]?.id ?? "",
  );
  const [delay, setDelay] = useState(String(draft?.startDelayMinutes ?? 0)),
    [title, setTitle] = useState(draft?.title ?? "Hypothetical start delay");
  const [description, setDescription] = useState(draft?.description ?? ""),
    [message, setMessage] = useState<string | null>(null);
  const [rawDirty, setRawDirty] = useState(false),
    [expanded, setExpanded] = useState(false),
    [history, setHistory] = useState("");
  usePendingForm(rawDirty);
  const impact = rawDirty ? null : view.impact;
  const historical = useMemo(
    () => (history ? selectHistoricalIncident(state, history) : null),
    [state, history],
  );
  const saveDraft = () => {
    setMessage(null);
    try {
      if (!baseline || view.baselineDirty)
        throw new Error("Apply a baseline first.");
      const startDelayMinutes = wholeMinute(delay);
      if (startDelayMinutes > state.document!.limits.maxMinute)
        throw new Error(
          `The start delay must not exceed ${state.document!.limits.maxMinute} minutes.`,
        );
      if (!title.trim() || !target)
        throw new Error("Choose an activity and enter an incident title.");
      const result = dispatch({
        type: "incident.configure",
        draft: {
          baselineVersion: baseline.baselineVersion,
          targetActivityId: target,
          startDelayMinutes,
          title,
          description: description || null,
        },
      });
      if (!result.ok) {
        setMessage(result.errors.map((error) => error.message).join(" "));
        return false;
      }
      setRawDirty(false);
      return true;
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Check the incident inputs.",
      );
      return false;
    }
  };
  return (
    <>
      <div className="grid gap-6 md:grid-cols-[minmax(250px,0.8fr)_2fr] md:items-start">
        <Panel>
          <Kicker>01 / Disruption</Kicker>
          <form
            noValidate
            className="space-y-5"
            onChange={() => setRawDirty(true)}
            onSubmit={(e) => {
              e.preventDefault();
              if (baseline && saveDraft()) {
                const result = dispatch({
                  type: "incident.apply",
                  expectedVersion: baseline.baselineVersion,
                  createdAt: auditInstant(),
                });
                if (result.ok) setRawDirty(false);
                else
                  setMessage(
                    result.errors.map((error) => error.message).join(" "),
                  );
              }
            }}
          >
            <Choice
              label="Incident activity"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              <option value="">Choose an activity</option>
              {baseline?.activities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Choice>
            <Field
              label="Delay from calculated baseline start (minutes)"
              inputMode="numeric"
              value={delay}
              onChange={(e) => setDelay(e.target.value)}
              hint="Whole elapsed minutes, zero or greater. Applying creates a new incident and clears its current recovery alternatives and preference."
            />
            <Field
              label="Incident title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <TextArea
              label="Incident description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {view.baselineResult?.activityTimings[target] && (
              <p className="font-mono text-xs">
                Baseline start{" "}
                {eventTime(
                  baseline!.event,
                  view.baselineResult.activityTimings[target].startMinute,
                )}{" "}
                · {baseline!.event.timezone}
              </p>
            )}
            <Errors message={message} />
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                className="min-h-12"
                disabled={
                  !baseline ||
                  view.baselineDirty ||
                  state.persistence.status === "loading"
                }
                onClick={saveDraft}
              >
                Save incident draft
              </Button>
              <Button
                type="submit"
                className="min-h-12"
                disabled={
                  !baseline ||
                  view.baselineDirty ||
                  state.persistence.status === "loading"
                }
              >
                Apply delay
              </Button>
            </div>
          </form>
          {view.appliedIncident && (
            <Confirm
              label="Reset incident"
              action={() => {
                dispatch({
                  type: "incident.reset",
                  expectedIncidentId: view.appliedIncident!.id,
                  createdAt: auditInstant(),
                  confirmed: true,
                });
              }}
            >
              Reset this incident to zero delay and clear its current recovery
              alternatives and preference? Historical incident and brief records
              remain available.
            </Confirm>
          )}
          {rawDirty && (
            <p role="status" className="text-sm">
              Unapplied form changes. Save incident draft to include them in the
              workspace, then Save workspace for browser storage. Current impact
              is withheld until Apply delay succeeds.
            </p>
          )}
        </Panel>
        <section
          className="space-y-5 border-l-4 border-destructive bg-danger-soft p-5 md:p-7"
          aria-label="Current incident impact"
        >
          <Kicker>
            Incident impact / {rawDirty ? "unapplied" : view.incidentStatus}
          </Kicker>
          {baseline && impact ? (
            <>
              <MilestoneMetrics baseline={baseline} result={impact} />
              <p>
                {impact.shiftedActivityIds.length} of{" "}
                {baseline.activities.length} activities shift, including any
                shifted milestones. {impact.incidentDescendantIds.length}{" "}
                downstream activities are reachable;{" "}
                {impact.downstreamAffectedActivityIds.length} have
                incident-caused start changes.
              </p>
              <Status>Baseline {baseline.baselineVersion} preserved</Status>
            </>
          ) : (
            <p>
              Apply a valid baseline and incident to inspect current results.
              Draft or invalid inputs do not display earlier timings as current.
            </p>
          )}
        </section>
      </div>
      {baseline && (
        <Schedule
          baseline={baseline}
          result={impact}
          reference={view.baselineResult}
        />
      )}
      <div className="grid gap-6 md:grid-cols-2">
        <Panel>
          <Kicker>02 / Why these times</Kicker>
          <h2>Binding constraints, activity by activity.</h2>
          <Button
            variant="outline"
            className="min-h-11"
            disabled={!impact}
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-controls="causal-detail"
          >
            {expanded ? "Hide explanation" : "Explain shifted times"}
          </Button>
          {expanded && impact && (
            <ul id="causal-detail" className="space-y-5">
              {impact.explanationPaths.map((explanation) => (
                <li
                  key={explanation.activityId}
                  className="space-y-2 border-b pb-4"
                >
                  <h3>
                    {
                      baseline!.activities.find(
                        (a) => a.id === explanation.activityId,
                      )?.name
                    }
                  </h3>
                  <p className="text-sm">
                    {explanation.bindingEarliestStart
                      ? "Earliest-start constraint is binding. "
                      : ""}
                    {explanation.startChangedDirectly
                      ? "Start changed directly. "
                      : ""}
                    {explanation.durationChangedDirectly
                      ? "Duration changed directly. "
                      : ""}
                    {explanation.incidentReachable
                      ? "Reachable from the incident. "
                      : "Not reachable from the incident. "}
                  </p>
                  {explanation.causeEdges.map((edge, index) => (
                    <p key={index} className="font-mono text-xs">
                      {edge.constraintContext}:{" "}
                      {
                        baseline!.activities.find(
                          (a) => a.id === edge.predecessorId,
                        )?.name
                      }{" "}
                      →{" "}
                      {
                        baseline!.activities.find(
                          (a) => a.id === edge.successorId,
                        )?.name
                      }
                      , finish{" "}
                      {eventTime(baseline!.event, edge.predecessorFinishMinute)}{" "}
                      + {edge.lagMinutes} min lag ={" "}
                      {eventTime(baseline!.event, edge.candidateStartMinute)}
                    </p>
                  ))}
                  {explanation.truncated && (
                    <p className="text-sm text-destructive">
                      Explanation truncated at the configured bound; this is not
                      a complete path.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel>
          <Kicker>03 / Constraints retained</Kicker>
          <h2>Inspect the unchanged baseline.</h2>
          {baseline?.activities
            .filter((a) => a.classification === "protected")
            .map((a) => (
              <p key={a.id}>
                {a.name}: protected duration {a.durationMinutes} min.
              </p>
            ))}
          <p className="text-sm">
            Reachability and actual movement are different measures. The engine
            reports both. Explanations identify binding finish-to-start
            constraints, not a global critical path.
          </p>
        </Panel>
      </div>
      <Panel>
        <h2>Incident history</h2>
        <Choice
          label="Historical incident"
          value={history}
          onChange={(e) => setHistory(e.target.value)}
        >
          <option value="">Choose a historical record</option>
          {Object.values(state.document!.incidents).map((i) => (
            <option key={i.id} value={i.id}>
              {i.title} · {i.id} · {i.baselineVersion}
            </option>
          ))}
        </Choice>
        {historical?.ok && (
          <>
            <Status>
              Historical context · {historical.value.result.baselineVersion}
            </Status>
            <MilestoneMetrics
              baseline={
                state.document!.baselineVersions[
                  historical.value.result.baselineVersion
                ]
              }
              result={historical.value.result}
            />
          </>
        )}
        {historical && !historical.ok && <Errors errors={historical.errors} />}
      </Panel>
      <Notice
        title="Assumptions are not availability confirmations"
        tone="warning"
      >
        Finish-to-start propagation, with the lags recorded in the baseline. No
        resource-capacity, supplier-availability or safety-readiness model. All
        clocks use the event timezone.
      </Notice>
      <LinkButton to="compare">Compare recovery options</LinkButton>
      <span className="sr-only">Workspace {controller.eventId}</span>
    </>
  );
}
export function Scenario() {
  const { state, view } = useLive();
  return (
    <>
      <Heading eyebrow={`Scenario Lab / ${view.event!.name}`}>
        Trace the disruption.
      </Heading>
      <IncidentLab
        key={`${state.document!.currentBaselineVersion}:${state.document!.activeIncidentId}`}
      />
    </>
  );
}
