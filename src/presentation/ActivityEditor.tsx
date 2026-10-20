import { useState } from "react";
import type { Activity } from "@/engine";
import { Button } from "@/components/ui/button";
import { Choice, Editor, Errors, Field, TextArea } from "@/presentation/forms";
import { newId, useLive, wholeMinute } from "@/presentation/app/live";
import { localInput } from "@/presentation/app/time";
import { useWallTime } from "@/presentation/WallTimeField";

function ActivityForm({
  activity,
  done,
}: {
  activity?: Activity;
  done: () => void;
}) {
  const { state, view, dispatch } = useLive(),
    event = view.event!,
    limit = state.document!.limits.maxMinute;
  const [name, setName] = useState(activity?.name ?? ""),
    [owner, setOwner] = useState(activity?.ownerName ?? "");
  const [duration, setDuration] = useState(
      String(activity?.durationMinutes ?? 60),
    ),
    [classification, setClassification] = useState<Activity["classification"]>(
      activity?.classification ?? "normal",
    );
  const [milestone, setMilestone] = useState(activity?.isMilestone ?? false),
    [notes, setNotes] = useState(activity?.notes ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const earliest = useWallTime(
    localInput(
      event.timezone,
      event.referenceInstant,
      activity?.earliestStartMinute ?? 0,
    ),
    event,
  );
  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        try {
          const durationMinutes = wholeMinute(duration),
            earliestStartMinute = earliest.read();
          if (!name.trim()) throw new Error("Enter an activity name.");
          if (
            earliestStartMinute < 0 ||
            earliestStartMinute > limit ||
            durationMinutes > limit
          )
            throw new Error(
              `Starts and durations must stay within 0–${limit} elapsed minutes.`,
            );
          if (milestone && durationMinutes !== 0)
            throw new Error(
              "A zero-duration milestone must have duration 0. Your entered duration was preserved.",
            );
          const result = dispatch({
            type: "activity.put",
            activity: {
              id: activity?.id ?? newId("activity"),
              eventId: event.id,
              name,
              ownerName: owner || null,
              earliestStartMinute,
              durationMinutes,
              classification,
              notes: notes || null,
              isMilestone: milestone,
            },
          });
          if (result.ok) done();
          else
            setMessage(result.errors.map((error) => error.message).join(" "));
        } catch (error) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Check the activity inputs.",
          );
        }
      }}
    >
      <Field
        label="Activity name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Field
        label="Owner"
        value={owner}
        onChange={(e) => setOwner(e.target.value)}
      />
      {earliest.field("Earliest start (event local)")}
      <Field
        label="Duration (minutes)"
        inputMode="numeric"
        value={duration}
        onChange={(e) => setDuration(e.target.value)}
        hint="Whole elapsed minutes. A milestone requires zero. Protected durations cannot be changed by recovery options."
      />
      <Choice
        label="Classification"
        value={classification}
        onChange={(e) =>
          setClassification(e.target.value as Activity["classification"])
        }
      >
        <option value="normal">Normal</option>
        <option value="approval_required">Approval required</option>
        <option value="protected">Protected</option>
      </Choice>
      <Choice
        label="Activity type"
        value={milestone ? "milestone" : "activity"}
        onChange={(e) => setMilestone(e.target.value === "milestone")}
      >
        <option value="activity">Activity</option>
        <option value="milestone">Zero-duration milestone</option>
      </Choice>
      <TextArea
        label="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <Errors message={message} />
      <Button type="submit" className="min-h-12">
        Save activity draft
      </Button>
    </form>
  );
}
export function ActivityEditor({ activity }: { activity?: Activity }) {
  const [open, setOpen] = useState(false);
  return (
    <Editor
      label={activity ? `Edit ${activity.name}` : "+ Create activity"}
      title={activity ? `Edit ${activity.name}` : "Create activity"}
      description="Edit baseline inputs. Validate and apply explicitly to create an immutable baseline revision."
      open={open}
      onOpenChange={setOpen}
    >
      {open && <ActivityForm activity={activity} done={() => setOpen(false)} />}
    </Editor>
  );
}
