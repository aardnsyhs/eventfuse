import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Heading, Kicker, Notice, Status } from "@/presentation/shared";
import { Choice, Errors, Field, TextArea } from "@/presentation/forms";
import { auditInstant, newId, useLive } from "@/presentation/app/live";
import { formatDateLabel, moneyLabel } from "@/presentation/app/format";
import { MilestoneMetrics } from "@/presentation/MilestoneMetrics";
import { Schedule } from "@/presentation/Schedule";
import { usePendingForm } from "@/presentation/app/usePendingForm";
import { motion, useReducedMotion } from "motion/react";
import type { BaselineSnapshot, RecoveryOption } from "@/engine";

function ModificationList({
  option,
  baseline,
}: {
  option: RecoveryOption;
  baseline: BaselineSnapshot;
}) {
  return (
    <ul className="space-y-2 text-sm">
      {option.modifications.map((change) => (
        <li key={`${change.activityId}:${change.field}`}>
          {baseline.activities.find(
            (activity) => activity.id === change.activityId,
          )?.name ?? change.activityId}{" "}
          · {change.field.replace("_", " ")} · {change.operation}{" "}
          {change.valueMinutes} elapsed min
        </li>
      ))}
    </ul>
  );
}

export function Brief() {
  const reduced = useReducedMotion();
  const { state, view, dispatch } = useLive(),
    document = state.document!;
  const [author, setAuthor] = useState(""),
    [nextActions, setNextActions] = useState(
      "Obtain required external confirmations\nReview production assumptions and recorded cost",
    );
  const [assumptions, setAssumptions] = useState(""),
    [history, setHistory] = useState(""),
    [copyStatus, setCopyStatus] = useState(""),
    [copyError, setCopyError] = useState<string | null>(null);
  const [draftDirty, setDraftDirty] = useState(false);
  usePendingForm(draftDirty);
  const article = useRef<HTMLElement>(null),
    copyInProgress = useRef(false);
  const brief = history
    ? (document.decisionBriefs.find((b) => b.id === history) ?? null)
    : view.briefView;
  const baseline = brief
    ? document.baselineVersions[brief.baselineVersion]
    : null;
  const historical =
    !!brief &&
    (brief.baselineVersion !== document.currentBaselineVersion ||
      brief.incidentId !== document.activeIncidentId ||
      view.baselineDirty ||
      view.incidentDirty ||
      view.recoveryDirty ||
      view.selected?.id !== brief.selectedRecoveryOptionId ||
      JSON.stringify(
        document.recoveryOptions[brief.selectedRecoveryOptionId],
      ) !== JSON.stringify(brief.recoverySnapshot));
  const copy = async () => {
    if (!article.current || copyInProgress.current) return;
    const text = article.current.innerText;
    copyInProgress.current = true;
    setCopyStatus("Copying…");
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(
        "Brief copied, including assumptions and approval warnings.",
      );
    } catch {
      setCopyStatus("");
      setCopyError(
        "Clipboard access failed. Select the brief text manually or use Print / save PDF.",
      );
    } finally {
      copyInProgress.current = false;
    }
  };
  return (
    <>
      <Heading eyebrow="Decision Brief / immutable prepared snapshots">
        A proposal for the production meeting.
      </Heading>
      <section
        className="no-print space-y-5 border bg-card p-5 md:p-7"
        aria-label="Prepare brief"
      >
        <h2>Prepare the selected proposal</h2>
        <p>
          {view.selected
            ? `${view.selected.name} is explicitly preferred. Approval remains ${view.selected.approvalStatus.replace("_", " ")}.`
            : "No current proposal is selected. Compare valid options and choose a preference first."}
        </p>
        <form
          noValidate
          className="space-y-5"
          onChange={() => setDraftDirty(true)}
          onSubmit={(e) => {
            e.preventDefault();
            const result = dispatch({
              type: "brief.prepare",
              expectedIncidentId: document.activeIncidentId!,
              metadata: {
                id: newId("brief"),
                authorLabel: author || null,
                createdAt: auditInstant(),
                nextActions: nextActions.split("\n").filter((s) => s.trim()),
                assumptionsAndConstraints: assumptions
                  .split("\n")
                  .filter((s) => s.trim()),
              },
            });
            if (result.ok) {
              setDraftDirty(false);
              setHistory("");
              setCopyStatus(
                "New immutable brief snapshot prepared. Save workspace to preserve it.",
              );
            }
          }}
        >
          <Field
            label="Prepared by (optional)"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
          <TextArea
            label="Next actions (one per line)"
            value={nextActions}
            onChange={(e) => setNextActions(e.target.value)}
          />
          <TextArea
            label="Additional assumptions and constraints (one per line)"
            value={assumptions}
            onChange={(e) => setAssumptions(e.target.value)}
          />
          <Button
            type="submit"
            className="min-h-12"
            disabled={!view.actions.prepareBrief}
          >
            Prepare brief snapshot
          </Button>
        </form>
        <Choice
          label="Prepared brief history"
          value={history}
          onChange={(e) => {
            setHistory(e.target.value);
            setCopyStatus("");
          }}
        >
          <option value="">Latest prepared brief</option>
          {document.decisionBriefs.map((b) => (
            <option key={b.id} value={b.id}>
              {b.createdAt} · {b.recoverySnapshot.name} · {b.baselineVersion}
            </option>
          ))}
        </Choice>
      </section>
      <div className="no-print flex flex-wrap items-center gap-3">
        <Button
          disabled={!brief}
          className="min-h-12"
          onClick={() => void copy()}
        >
          Copy brief
        </Button>
        <Button
          variant="outline"
          disabled={!brief}
          className="min-h-12"
          onClick={() => window.print()}
        >
          Print / save PDF
        </Button>
        <Status tone="warning">Proposed · not authorized</Status>
      </div>
      <p role="status" aria-live="polite" className="no-print text-sm">
        {copyStatus}
      </p>
      <Errors message={copyError} />
      {!brief && (
        <Notice title="No prepared brief">
          A brief is created only from a current valid comparison and an
          explicit preference. No reference option has been substituted for your
          choice.
        </Notice>
      )}
      {brief && baseline && (
        <motion.article
          key={brief.id}
          initial={reduced ? false : { opacity: 0.7 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduced ? 0 : 0.14 }}
          ref={article}
          aria-label="Prepared decision brief"
          className="decision-brief space-y-7 border border-t-4 border-t-foreground bg-card p-5 md:p-10"
        >
          <Kicker>EventFuse / decision record / {brief.id}</Kicker>
          <h2 className="text-[2rem] md:text-5xl">
            {brief.eventSnapshot.name}
          </h2>
          <p className="font-mono text-xs">
            {formatDateLabel(brief.eventSnapshot)}
            <br />
            Baseline {brief.baselineVersion} · Incident {brief.incidentId}
            <br />
            Prepared {brief.createdAt} ·{" "}
            {brief.authorLabel ?? "Author not entered"}
          </p>
          <Status tone={historical ? "warning" : "neutral"}>
            {historical
              ? "Historical snapshot · not the current proposal"
              : "Prepared snapshot · save workspace to preserve"}
          </Status>
          <Notice
            title="Hypothetical simulation. Operational validation is required."
            tone="warning"
          >
            <p>
              Additional cost:{" "}
              {moneyLabel(
                brief.recoverySnapshot.costMinorUnits,
                brief.recoverySnapshot.currency,
              )}
              .
            </p>
            <p>
              Approval status:{" "}
              {brief.recoverySnapshot.approvalStatus.replace("_", " ")}.
            </p>
            <p>{brief.approvalDisclaimer}</p>
            <p>
              Selection does not authorize work; pending approvals remain
              outstanding.
            </p>
          </Notice>
          <div className="grid gap-6 md:grid-cols-3">
            <section className="space-y-4">
              <Kicker>Baseline</Kicker>
              <MilestoneMetrics
                baseline={baseline}
                result={brief.baselineSnapshot}
              />
            </section>
            <section className="space-y-4">
              <Kicker>Unmitigated incident</Kicker>
              <MilestoneMetrics
                baseline={baseline}
                result={brief.unmitigatedSnapshot}
              />
            </section>
            <section className="space-y-4">
              <Kicker>Preferred proposal / conditional</Kicker>
              <MilestoneMetrics
                baseline={baseline}
                result={brief.scenarioSnapshot}
              />
            </section>
          </div>
          <Separator />
          <div className="grid gap-6 md:grid-cols-2">
            <section className="space-y-3">
              <Kicker>01 / Incident</Kicker>
              <h3>{brief.incidentSnapshot.title}</h3>
              <p>{brief.incidentSnapshot.description}</p>
              <p>
                Target:{" "}
                {
                  baseline.activities.find(
                    (a) => a.id === brief.incidentSnapshot.targetActivityId,
                  )?.name
                }{" "}
                · {brief.incidentSnapshot.startDelayMinutes} min start delay.
              </p>
            </section>
            <section className="space-y-3">
              <Kicker>02 / Preferred proposal</Kicker>
              <h3>{brief.recoverySnapshot.name}</h3>
              <p>{brief.recoverySnapshot.description}</p>
              <ModificationList
                option={brief.recoverySnapshot}
                baseline={baseline}
              />
              <p>
                {brief.scenarioSnapshot.shiftedActivityIds.length} activities
                shifted from baseline ·{" "}
                {brief.scenarioSnapshot.incidentDescendantIds.length} downstream
                reachable ·{" "}
                {brief.scenarioSnapshot.downstreamAffectedActivityIds.length}{" "}
                with incident-caused start changes.
              </p>
            </section>
          </div>
          <Schedule
            baseline={baseline}
            result={brief.scenarioSnapshot}
            reference={brief.baselineSnapshot}
          />
          <section className="space-y-3">
            <Kicker>03 / Assumptions & constraints</Kicker>
            <ul className="space-y-2 text-sm">
              {[
                ...brief.assumptionsAndConstraints,
                ...brief.recoverySnapshot.assumptionNotes,
              ].map((text, i) => (
                <li key={i}>{text}</li>
              ))}
            </ul>
            <p>
              Deterministic finish-to-start propagation. No resource-capacity,
              supplier-availability or safety-certification model.
            </p>
            {brief.recoverySnapshot.approvalRequirements?.map((r, i) => (
              <p key={i}>
                {r.approverLabel}: {r.condition}
              </p>
            ))}
            {brief.recoverySnapshot.approvalContext && (
              <p>
                External confirmation context:{" "}
                {brief.recoverySnapshot.approvalContext}
              </p>
            )}
          </section>
          <section className="space-y-3">
            <Kicker>04 / Warnings retained</Kicker>
            <ul className="space-y-2 text-sm">
              {brief.scenarioSnapshot.validationWarnings.map((warning, i) => (
                <li key={i}>
                  <strong>{warning.code}</strong>: {warning.message}
                </li>
              ))}
            </ul>
          </section>
          <section className="space-y-3">
            <Kicker>05 / Alternatives at preparation</Kicker>
            {brief.comparisonOptionSnapshots.map((option) => (
              <div key={option.id} className="space-y-3 border-b py-4">
                <h3>{option.name}</h3>
                <p>{option.description}</p>
                <ModificationList option={option} baseline={baseline} />
                <p>
                  Additional cost:{" "}
                  {moneyLabel(option.costMinorUnits, option.currency)} ·
                  Approval {option.approvalStatus.replace("_", " ")}
                </p>
                <MilestoneMetrics
                  baseline={baseline}
                  result={
                    brief.comparisonResultSnapshots.find(
                      (r) => r.recoveryOptionId === option.id,
                    ) ?? null
                  }
                />
                <ul className="space-y-2 text-sm">
                  {option.assumptionNotes.map((note, index) => (
                    <li key={index}>{note}</li>
                  ))}
                </ul>
                {option.approvalRequirements?.map((requirement, index) => (
                  <p key={index}>
                    {requirement.approverLabel}: {requirement.condition}
                  </p>
                ))}
                {option.approvalContext && (
                  <p>External confirmation context: {option.approvalContext}</p>
                )}
                <ul className="space-y-2 text-sm">
                  {brief.comparisonResultSnapshots
                    .find((result) => result.recoveryOptionId === option.id)
                    ?.validationWarnings.map((warning, index) => (
                      <li key={index}>
                        <strong>{warning.code}</strong>: {warning.message}
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </section>
          <section className="space-y-3">
            <Kicker>06 / Next actions</Kicker>
            <ul className="space-y-2">
              {brief.nextActions.map((action, i) => (
                <li key={i}>□ {action}</li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Recorded next actions, not recorded completion. Later edits do not
              change this snapshot. No public sharing link is created.
            </p>
          </section>
        </motion.article>
      )}
    </>
  );
}
