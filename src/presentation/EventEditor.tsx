import { useState } from "react";
import type { Event } from "@/engine";
import { validateBaseline } from "@/engine";
import { CURRENCY_EXPONENTS } from "@/domain/currency";
import { Button } from "@/components/ui/button";
import { Choice, Editor, Errors, Field, TextArea } from "@/presentation/forms";
import { auditInstant, newId } from "@/presentation/app/live";
import { localInput, resolveLocalTime } from "@/presentation/app/time";
import { useWorkspaceContext } from "@/presentation/app/workspace-context";
import { DateField } from "@/presentation/DateField";

export function EventEditor({
  create = false,
  onCreated,
}: {
  create?: boolean;
  onCreated?: () => void;
}) {
  const { controller, openWorkspace, setActiveWorkspace, refreshCatalog } =
    useWorkspaceContext();
  const [open, setOpen] = useState(false),
    [message, setMessage] = useState<string | null>(null);
  const [name, setName] = useState(""),
    [date, setDate] = useState("2026-10-15"),
    [zone, setZone] = useState("Asia/Jakarta");
  const [reference, setReference] = useState("2026-10-15T08:00"),
    [currency, setCurrency] = useState("USD");
  const [description, setDescription] = useState(""),
    [location, setLocation] = useState("");
  const [candidates, setCandidates] = useState<readonly string[]>([]),
    [chosen, setChosen] = useState("");
  const initialize = (next: boolean) => {
    if (next) {
      const doc = controller?.getSnapshot().document,
        e = !create ? doc?.editing.baseline.event : null;
      setName(e?.name ?? "");
      setDate(e?.date ?? "2026-10-15");
      setZone(e?.timezone ?? "Asia/Jakarta");
      setReference(
        e ? localInput(e.timezone, e.referenceInstant) : "2026-10-15T08:00",
      );
      setCurrency(!create ? (doc?.currency ?? "USD") : "USD");
      setDescription(e?.description ?? "");
      setLocation(e?.location ?? "");
      setMessage(null);
      setCandidates([]);
      setChosen("");
    }
    setOpen(next);
  };
  return (
    <Editor
      label={create ? "+ Create local event" : "Edit event"}
      title={create ? "Create a local event" : "Edit event draft"}
      description="Use the event's IANA timezone. Applying a new baseline preserves previous revisions and clears the current scenario context."
      open={open}
      onOpenChange={initialize}
    >
      <form
        noValidate
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          setMessage(null);
          const resolved = resolveLocalTime(
            { date, timezone: zone, referenceInstant: "2000-01-01T00:00:00Z" },
            reference,
            chosen,
          );
          if (!resolved.ok) {
            setMessage(resolved.message);
            setCandidates(resolved.candidates ?? []);
            return;
          }
          const previous = !create
            ? controller?.getSnapshot().editing?.baseline.event
            : null;
          const now = auditInstant();
          const source: Event = {
            id: previous?.id ?? newId("event"),
            name,
            date,
            timezone: zone,
            referenceInstant: resolved.iso,
            description: description || null,
            location: location || null,
            createdAt: previous?.createdAt ?? now,
            updatedAt: now,
            schemaVersion: 1,
          };
          const valid = validateBaseline(
            {
              baselineVersion: "event-draft",
              event: source,
              activities: [],
              dependencies: [],
              milestones: [],
            },
            "draft",
          );
          if (!valid.ok) {
            setMessage(
              valid.errors.map((e) => `${e.path}: ${e.message}`).join(" "),
            );
            return;
          }
          const owner = create
            ? openWorkspace("workspace", source.id)
            : controller!;
          const result = create
            ? owner.dispatch({
                type: "event.create",
                event: source,
                currency,
                namespace: "workspace",
              })
            : owner.dispatch({
                type: "event.edit",
                patch: {
                  name,
                  date,
                  timezone: zone,
                  referenceInstant: resolved.iso,
                  description: source.description,
                  location: source.location,
                  updatedAt: now,
                },
              });
          if (!result.ok) {
            setMessage(result.errors.map((e) => e.message).join(" "));
            return;
          }
          if (create) {
            setActiveWorkspace(owner.key);
            try {
              sessionStorage.setItem(
                "eventfuse:active",
                JSON.stringify({ namespace: "workspace", eventId: source.id }),
              );
            } catch {
              /* The in-memory event remains available when session storage is disabled. */
            }
          }
          void refreshCatalog();
          setOpen(false);
          window.location.hash = "workspace";
          onCreated?.();
        }}
      >
        <Field
          label="Event name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <DateField
          label="Event date"
          value={date}
          onChange={(value) => {
            setDate(value);
            setChosen("");
          }}
        />
        <Field
          label="IANA timezone"
          value={zone}
          onChange={(e) => {
            setZone(e.target.value);
            setChosen("");
          }}
          hint="For example Asia/Jakarta or America/New_York. The browser's timezone is never assumed."
        />
        <DateField
          label="Production reference (event local)"
          dateTime
          value={reference}
          onChange={(value) => {
            setReference(value);
            setChosen("");
          }}
          hint="Elapsed activity minutes are measured from this instant. DST gaps are rejected; repeated times require an explicit UTC choice."
        />
        {!!candidates.length && (
          <Choice
            label="Repeated time: UTC instant"
            value={chosen}
            onChange={(e) => setChosen(e.target.value)}
          >
            <option value="">Choose an occurrence</option>
            {candidates.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </Choice>
        )}
        {create ? (
          <Choice
            label="Event currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {Object.keys(CURRENCY_EXPONENTS).map((code) => (
              <option key={code}>{code}</option>
            ))}
          </Choice>
        ) : (
          <p className="text-sm">
            Currency: {currency}. Fixed for this workspace; no FX conversion.
          </p>
        )}
        <Field
          label="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <TextArea
          label="Event description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Errors message={message} />
        <Button type="submit" className="min-h-12">
          {create ? "Create event draft" : "Save event draft"}
        </Button>
      </form>
    </Editor>
  );
}
