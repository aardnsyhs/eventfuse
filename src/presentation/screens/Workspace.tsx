import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Heading,
  Kicker,
  LinkButton,
  Notice,
  Panel,
  Status,
} from "@/presentation/shared";
import { useLive } from "@/presentation/app/live";
import { useWorkspaceContext } from "@/presentation/app/workspace-context";
import { EventEditor } from "@/presentation/EventEditor";
import { Choice, Errors } from "@/presentation/forms";
import { eventTime } from "@/presentation/app/time";
import { openDemo, DEMO_EVENT_ID } from "@/demo/install";

export function Workspace() {
  const { controller, state, view } = useLive();
  const {
    catalog,
    catalogError,
    refreshCatalog,
    registry,
    openWorkspace,
    setActiveWorkspace,
  } = useWorkspaceContext();
  const [choice, setChoice] = useState(""),
    [message, setMessage] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    void refreshCatalog();
  }, [refreshCatalog]);
  const switchTo = async (demo: boolean, eventId = choice) => {
    if (
      state.persistence.status !== "saved" &&
      !window.confirm(
        "Leave this unsaved event open in memory and switch events? Save first if you need it after this tab closes.",
      )
    )
      return;
    setBusy(true);
    setMessage(null);
    const owner = openWorkspace(
      demo ? "demo" : "workspace",
      demo ? DEMO_EVENT_ID : eventId,
    );
    if (!owner.getSnapshot().document) {
      if (demo) {
        const result = await openDemo(
          owner,
          registry.runtime.nextStorageRevision,
          registry.runtime.port,
        );
        if (!mounted.current) return;
        if (!result.ok) {
          setMessage(result.message);
          setBusy(false);
          return;
        }
      } else {
        const result = await owner.load("workspace", eventId);
        if (!mounted.current) return;
        if (!result.ok || !result.value) {
          setMessage(
            result.ok
              ? "Saved event not found. No current work was replaced."
              : result.errors.map((e) => `${e.code}: ${e.message}`).join(" "),
          );
          setBusy(false);
          return;
        }
      }
    }
    setActiveWorkspace(owner.key);
    try {
      sessionStorage.setItem(
        "eventfuse:active",
        JSON.stringify({ namespace: owner.namespace, eventId: owner.eventId }),
      );
    } catch {
      /* Switching still works without a reload pointer. */
    }
    setBusy(false);
  };
  const event = view.event!,
    draft = state.editing!.baseline;
  const openEvents = registry
    .openKeys()
    .map((key) => registry.peek(key)!)
    .filter(
      (owner) =>
        owner.key !== controller.key &&
        owner.namespace === "workspace" &&
        owner.getSnapshot().document,
    );
  return (
    <>
      <Heading eyebrow="Workspace / technical setup before doors">
        {event.name}
      </Heading>
      <Notice
        title={
          controller.namespace === "demo"
            ? "Your own fictional workspace"
            : "Your local workspace"
        }
      >
        Changes remain in this tab until Save workspace succeeds. Applied
        baseline revisions and prepared brief snapshots preserve their original
        sources.
      </Notice>
      <div className="flex flex-wrap gap-3">
        <EventEditor />
        <EventEditor create />
        <Button
          variant="outline"
          className="min-h-11"
          disabled={busy || controller.namespace === "demo"}
          onClick={() => void switchTo(true)}
        >
          Open fictional demo
        </Button>
      </div>
      <section
        className="grid items-end gap-4 sm:grid-cols-[1fr_auto_auto]"
        aria-label="Saved events"
      >
        <Choice
          label="Saved local events"
          value={choice}
          onChange={(e) => setChoice(e.target.value)}
        >
          <option value="">Choose a saved event</option>
          {catalog.map((item) => (
            <option key={item.eventId} value={item.eventId}>
              {item.name}
            </option>
          ))}
        </Choice>
        <Button
          disabled={busy || !choice}
          className="min-h-12"
          onClick={() => void switchTo(false)}
        >
          Open saved event
        </Button>
        <Button
          variant="outline"
          disabled={busy}
          className="min-h-12"
          onClick={() => void refreshCatalog()}
        >
          Refresh events
        </Button>
        <Errors message={message ?? catalogError} />
      </section>
      {!!openEvents.length && (
        <Panel>
          <h2>Other events open in this tab</h2>
          <p className="text-sm">
            Resume an in-memory event, including one you have not saved yet.
            Unsaved events disappear when this tab closes.
          </p>
          <div className="flex flex-wrap gap-3">
            {openEvents.map((owner) => (
              <Button
                key={owner.key}
                variant="outline"
                className="min-h-11"
                disabled={busy}
                onClick={() => void switchTo(false, owner.eventId)}
              >
                Resume {owner.getSnapshot().editing!.baseline.event.name}
              </Button>
            ))}
          </div>
        </Panel>
      )}
      <dl className="grid gap-5 md:grid-cols-3">
        {[
          ["Production reference", eventTime(event, 0)],
          ["Activities in draft", `${draft.activities.length}`],
          ["Critical milestones in draft", `${draft.milestones.length}`],
        ].map(([label, value]) => (
          <div key={label} className="space-y-2 border-y py-4">
            <dt className="font-mono text-xs text-muted-foreground">{label}</dt>
            <dd className="text-[2.5rem] font-semibold tracking-tight">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-6 md:grid-cols-[1.6fr_1fr]">
        <Panel>
          <Status tone={view.baselineDirty ? "warning" : "success"}>
            {view.baselineDirty
              ? "Unapplied baseline draft"
              : view.activeBaseline
                ? "Applied baseline"
                : "No applied baseline"}
          </Status>
          <h2>A plan to understand before changing it.</h2>
          <p>
            {event.description ||
              "Add activities, finish-to-start dependencies and explicit critical deadlines to build a runnable baseline."}
          </p>
          <p className="break-all font-mono text-xs">
            {view.activeBaseline?.baselineVersion ?? "Draft only"} ·{" "}
            {state.document!.currency}
          </p>
          <LinkButton to="blueprint" secondary>
            Open Blueprint · view all {draft.activities.length} activities
          </LinkButton>
          <p className="text-xs text-muted-foreground">
            Schedule alignment does not certify safety or operational readiness.
          </p>
        </Panel>
        <Panel>
          <Kicker>Scenario context</Kicker>
          <h2>{view.appliedIncident?.title ?? "Prepare a disruption"}</h2>
          <p>
            {view.appliedIncident
              ? `${view.appliedIncident.startDelayMinutes} min start delay. ${view.incidentStatus} scenario context.`
              : "Apply a baseline before testing an incident. Draft events can be saved without milestones."}
          </p>
          <LinkButton to="scenario">Open Scenario Lab</LinkButton>
        </Panel>
      </div>
      <Panel>
        <h2>History retained in this workspace</h2>
        <p>
          {view.revisions.length} baseline revisions ·{" "}
          {Object.keys(state.document!.incidents).length} incident records ·{" "}
          {state.document!.decisionBriefs.length} prepared briefs.
        </p>
        <p className="text-sm">
          Use Blueprint to restore a revision into a new draft. Prepared briefs
          remain historical snapshots after later edits.
        </p>
      </Panel>
    </>
  );
}
