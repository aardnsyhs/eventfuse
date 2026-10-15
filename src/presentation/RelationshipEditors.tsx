import { useState } from "react";
import type { CriticalMilestone, Dependency } from "@/engine";
import { Button } from "@/components/ui/button";
import { Choice, Editor, Errors, Field } from "@/presentation/forms";
import { newId, useLive, wholeMinute } from "@/presentation/app/live";
import { useWallTime } from "@/presentation/WallTimeField";
import { localInput } from "@/presentation/app/time";

function DependencyForm({
  dependency,
  done,
}: {
  dependency?: Dependency;
  done: () => void;
}) {
  const { state, dispatch } = useLive(),
    baseline = state.editing!.baseline;
  const [predecessor, setPredecessor] = useState(
    dependency?.predecessorId ?? baseline.activities[0]?.id ?? "",
  );
  const [successor, setSuccessor] = useState(
    dependency?.successorId ?? baseline.activities[1]?.id ?? "",
  );
  const [lag, setLag] = useState(String(dependency?.lagMinutes ?? 0)),
    [message, setMessage] = useState<string | null>(null);
  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        try {
          if (!predecessor || !successor)
            throw new Error("Choose two activities.");
          if (predecessor === successor)
            throw new Error("An activity cannot depend on itself.");
          const result = dispatch({
            type: "dependency.put",
            dependency: {
              id: dependency?.id ?? newId("dependency"),
              eventId: baseline.event.id,
              predecessorId: predecessor,
              successorId: successor,
              type: "finish_to_start",
              lagMinutes: wholeMinute(lag),
            },
          });
          if (result.ok) done();
          else
            setMessage(result.errors.map((error) => error.message).join(" "));
        } catch (error) {
          setMessage(
            error instanceof Error ? error.message : "Check the dependency.",
          );
        }
      }}
    >
      <Choice
        label="Predecessor"
        value={predecessor}
        onChange={(e) => setPredecessor(e.target.value)}
      >
        <option value="">Choose an activity</option>
        {baseline.activities.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </Choice>
      <Choice
        label="Successor"
        value={successor}
        onChange={(e) => setSuccessor(e.target.value)}
      >
        <option value="">Choose an activity</option>
        {baseline.activities.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </Choice>
      <Field
        label="Finish-to-start lag (minutes)"
        inputMode="numeric"
        value={lag}
        onChange={(e) => setLag(e.target.value)}
      />
      <Errors message={message} />
      <Button type="submit" className="min-h-12">
        Save dependency draft
      </Button>
    </form>
  );
}
export function DependencyEditor({ dependency }: { dependency?: Dependency }) {
  const [open, setOpen] = useState(false);
  return (
    <Editor
      label={dependency ? "Edit dependency" : "+ Create dependency"}
      title="Finish-to-start dependency"
      description="The successor starts after the predecessor finishes plus the lag. Validate the full draft to detect cycles and duplicate edges."
      open={open}
      onOpenChange={setOpen}
    >
      {open && (
        <DependencyForm dependency={dependency} done={() => setOpen(false)} />
      )}
    </Editor>
  );
}
function MilestoneForm({
  milestone,
  done,
}: {
  milestone?: CriticalMilestone;
  done: () => void;
}) {
  const { state, dispatch } = useLive(),
    baseline = state.editing!.baseline;
  const [label, setLabel] = useState(milestone?.label ?? ""),
    [activityId, setActivityId] = useState(
      milestone?.activityId ?? baseline.activities[0]?.id ?? "",
    ),
    [message, setMessage] = useState<string | null>(null);
  const deadline = useWallTime(
    localInput(
      baseline.event.timezone,
      baseline.event.referenceInstant,
      milestone?.deadlineMinute ?? 540,
    ),
    baseline.event,
  );
  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        try {
          if (!label.trim() || !activityId)
            throw new Error("Enter a label and choose an activity.");
          const result = dispatch({
            type: "milestone.put",
            milestone: {
              id: milestone?.id ?? newId("milestone"),
              eventId: baseline.event.id,
              activityId,
              label,
              deadlineMinute: deadline.read(),
            },
          });
          if (result.ok) done();
          else
            setMessage(result.errors.map((error) => error.message).join(" "));
        } catch (error) {
          setMessage(
            error instanceof Error ? error.message : "Check the milestone.",
          );
        }
      }}
    >
      <Field
        label="Critical milestone label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
      <Choice
        label="Deadline activity"
        value={activityId}
        onChange={(e) => setActivityId(e.target.value)}
      >
        <option value="">Choose an activity</option>
        {baseline.activities.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </Choice>
      {deadline.field("Deadline (event local)")}
      <Errors message={message} />
      <Button type="submit" className="min-h-12">
        Save milestone draft
      </Button>
    </form>
  );
}
export function MilestoneEditor({
  milestone,
}: {
  milestone?: CriticalMilestone;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Editor
      label={milestone ? "Edit milestone" : "+ Create critical milestone"}
      title="Critical milestone deadline"
      description="A critical deadline can track any activity's finish. Runnable baselines require at least one critical milestone."
      open={open}
      onOpenChange={setOpen}
    >
      {open && (
        <MilestoneForm milestone={milestone} done={() => setOpen(false)} />
      )}
    </Editor>
  );
}
