import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Heading,
  LinkButton,
  Notice,
  Panel,
  Status,
} from "@/presentation/shared";
import { ActivityEditor } from "@/presentation/ActivityEditor";
import {
  DependencyEditor,
  MilestoneEditor,
} from "@/presentation/RelationshipEditors";
import { DependencyGraph } from "@/presentation/DependencyGraph";
import { Schedule } from "@/presentation/Schedule";
import { MilestoneMetrics } from "@/presentation/MilestoneMetrics";
import { Choice, Confirm } from "@/presentation/forms";
import { useLive } from "@/presentation/app/live";
import { eventTime } from "@/presentation/app/time";
import { inspectBaseline } from "@/presentation/app/history";

export function Blueprint() {
  const { state, view, dispatch } = useLive(),
    baseline = state.editing!.baseline;
  const [revision, setRevision] = useState("");
  const [inspection, setInspection] =
    useState<ReturnType<typeof inspectBaseline>>(null);
  return (
    <>
      <Heading eyebrow={`${view.event!.name} / baseline`}>
        The production blueprint
      </Heading>
      <div className="flex flex-wrap items-center gap-3">
        <Status tone={view.baselineDirty ? "warning" : "success"}>
          {view.baselineDirty
            ? "Unapplied baseline draft"
            : "Applied baseline · scenarios preserve this revision"}
        </Status>
        <ActivityEditor />
        <DependencyEditor />
        <MilestoneEditor />
        <Dialog>
          <DialogTrigger
            render={<Button variant="outline" className="min-h-11" />}
          >
            Open graph explorer ↗
          </DialogTrigger>
          <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-none sm:max-w-[min(90vw,1200px)]">
            <DialogHeader>
              <DialogTitle>Inspect relationships</DialogTitle>
              <DialogDescription>
                Actual draft relationships. Moving nodes changes this view only.
              </DialogDescription>
            </DialogHeader>
            <DependencyGraph baseline={baseline} />
          </DialogContent>
        </Dialog>
      </div>
      <Notice title="Schedule-ready is not safety-certified">
        Validation checks activity constraints, dependency cycles and explicit
        critical deadlines. Applying a baseline creates a new revision and
        clears current incident and preference context. Historical records are
        retained.
      </Notice>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          className="min-h-12"
          disabled={!view.actions.edit}
          onClick={() => dispatch({ type: "baseline.validate" })}
        >
          Validate baseline
        </Button>
        <Button
          className="min-h-12"
          disabled={!view.actions.applyBaseline}
          onClick={() => {
            if (
              !view.activeBaseline ||
              window.confirm(
                "Apply a new baseline revision? Current incident and preferred proposal will be cleared. Historical sources remain available.",
              )
            )
              dispatch({
                type: "baseline.apply",
                expectedVersion: state.document!.currentBaselineVersion,
              });
          }}
        >
          Apply baseline
        </Button>
        <p role="status" className="self-center text-sm">
          Validation: {view.baselineValidity}
        </p>
      </div>
      <Schedule
        baseline={baseline}
        result={!view.baselineDirty ? state.calculation.baseline : null}
        editAction={(activity) => <ActivityEditor activity={activity} />}
      />
      <MilestoneMetrics baseline={baseline} result={view.baselineResult} />
      <Panel>
        <h2>Activity constraints</h2>
        {!baseline.activities.length && (
          <p>No activities yet. Create one to start the draft.</p>
        )}
        <ul className="divide-y">
          {baseline.activities.map((activity) => (
            <li key={activity.id} className="space-y-3 py-4">
              <h3>{activity.name}</h3>
              <p className="text-sm">
                Earliest{" "}
                {eventTime(baseline.event, activity.earliestStartMinute)} ·{" "}
                {activity.durationMinutes} min ·{" "}
                {activity.ownerName ?? "Owner not entered"} ·{" "}
                {activity.classification}
                {activity.isMilestone ? " · zero-duration milestone" : ""}
              </p>
              <div className="flex flex-wrap gap-3">
                <ActivityEditor activity={activity} />
                <Confirm
                  label={`Delete ${activity.name}`}
                  action={() => {
                    dispatch({
                      type: "activity.remove",
                      id: activity.id,
                      milestoneReplacements: [],
                    });
                  }}
                >
                  Delete this activity, all its incoming and outgoing
                  dependencies, and every critical milestone attached to it?
                  This explicitly removes affected milestone records; other
                  milestones are preserved. Apply a new baseline to replace the
                  current revision.
                </Confirm>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
      <div className="grid gap-6 md:grid-cols-2">
        <Panel>
          <h2>Dependencies</h2>
          {!baseline.dependencies.length && (
            <p>No dependencies in this draft.</p>
          )}
          <ul className="divide-y">
            {baseline.dependencies.map((d) => (
              <li key={d.id} className="space-y-3 py-4">
                <p>
                  {
                    baseline.activities.find((a) => a.id === d.predecessorId)
                      ?.name
                  }{" "}
                  →{" "}
                  {
                    baseline.activities.find((a) => a.id === d.successorId)
                      ?.name
                  }{" "}
                  · lag {d.lagMinutes} min
                </p>
                <div className="flex flex-wrap gap-3">
                  <DependencyEditor dependency={d} />
                  <Confirm
                    label="Delete dependency"
                    action={() => {
                      dispatch({ type: "dependency.remove", id: d.id });
                    }}
                  >
                    Delete this dependency from the draft?
                  </Confirm>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <h2>Critical milestones</h2>
          {!baseline.milestones.length && (
            <p>
              No critical deadlines. You may save a draft, but must add one
              before applying a runnable baseline.
            </p>
          )}
          <ul className="divide-y">
            {baseline.milestones.map((m) => (
              <li key={m.id} className="space-y-3 py-4">
                <h3>{m.label}</h3>
                <p>
                  {baseline.activities.find((a) => a.id === m.activityId)?.name}{" "}
                  · deadline {eventTime(baseline.event, m.deadlineMinute)}
                </p>
                <div className="flex flex-wrap gap-3">
                  <MilestoneEditor milestone={m} />
                  <Confirm
                    label="Delete milestone"
                    action={() => {
                      dispatch({ type: "milestone.remove", id: m.id });
                    }}
                  >
                    Delete this critical milestone from the draft?
                  </Confirm>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <DependencyGraph
        key={state.document!.currentBaselineVersion ?? "draft"}
        baseline={baseline}
      />
      <Panel>
        <h2>Baseline revision history</h2>
        <Choice
          label="Historical revision"
          value={revision}
          onChange={(e) => {
            setRevision(e.target.value);
            setInspection(inspectBaseline(state.document!, e.target.value));
          }}
        >
          <option value="">Choose a revision</option>
          {view.revisions.map((r) => (
            <option key={r.baselineVersion} value={r.baselineVersion}>
              {r.baselineVersion} · {r.activities.length} activities
            </option>
          ))}
        </Choice>
        {inspection &&
          state.document!.baselineVersions[
            inspection.baseline.baselineVersion
          ] && (
            <section
              aria-label="Read-only historical baseline"
              className="space-y-4"
            >
              <Status>Historical revision · read only</Status>
              <p>
                {inspection.baseline.event.name} ·{" "}
                {inspection.baseline.baselineVersion}
              </p>
              {inspection.result.ok ? (
                <>
                  <Schedule
                    baseline={inspection.baseline}
                    result={inspection.result.value}
                  />
                  <MilestoneMetrics
                    baseline={inspection.baseline}
                    result={inspection.result.value}
                  />
                </>
              ) : (
                <p>This historical revision could not be calculated.</p>
              )}
              <details>
                <summary className="inline-flex min-h-11 items-center underline">
                  Inspect immutable source inputs
                </summary>
                <pre className="wrap-anywhere whitespace-pre-wrap font-mono text-xs">
                  {JSON.stringify(inspection.baseline, null, 2)}
                </pre>
              </details>
            </section>
          )}
        <Button
          variant="outline"
          className="min-h-11"
          disabled={!revision || !state.document!.baselineVersions[revision]}
          onClick={() => {
            if (
              window.confirm(
                "Replace the editable baseline draft with this revision? Its historical source will remain immutable.",
              )
            )
              dispatch({ type: "baseline.restoreDraft", version: revision });
          }}
        >
          Restore revision into draft
        </Button>
      </Panel>
      <LinkButton to="scenario">Continue to Scenario Lab</LinkButton>
    </>
  );
}
