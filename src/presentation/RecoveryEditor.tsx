import { useState } from "react";
import type {
  ApprovalStatus,
  RecoveryModification,
  RecoveryOption,
} from "@/engine";
import { parseRecoveryCost } from "@/engine";
import { costInput } from "@/presentation/app/format";
import { Button } from "@/components/ui/button";
import { Choice, Editor, Errors, Field, TextArea } from "@/presentation/forms";
import { signedMinute, useLive } from "@/presentation/app/live";

type ModificationDraft = {
  activityId: string;
  field: RecoveryModification["field"];
  operation: "set" | "add";
  value: string;
  key: number;
};
function RecoveryForm({
  option,
  done,
}: {
  option?: RecoveryOption;
  done: () => void;
}) {
  const { state, view, dispatch } = useLive(),
    incidentId = state.document!.activeIncidentId!,
    baseline = view.activeBaseline!;
  const [name, setName] = useState(option?.name ?? ""),
    [description, setDescription] = useState(option?.description ?? "");
  const [costKnown, setCostKnown] = useState(option?.costMinorUnits != null),
    [cost, setCost] = useState(
      option?.costMinorUnits != null
        ? costInput(option.costMinorUnits, state.document!.currency)
        : "",
    );
  const [approval, setApproval] = useState<ApprovalStatus>(
      option?.approvalStatus ?? "pending",
    ),
    [context, setContext] = useState(option?.approvalContext ?? "");
  const [requirements, setRequirements] = useState(
    option?.approvalRequirements
      ?.map((r) => `${r.approverLabel} | ${r.condition}`)
      .join("\n") ?? "",
  );
  const [assumptions, setAssumptions] = useState(
    option?.assumptionNotes.join("\n") ?? "",
  );
  const [changes, setChanges] = useState<ModificationDraft[]>(
    option?.modifications.map((m, key) => ({
      ...m,
      value: String(m.valueMinutes),
      key,
    })) ?? [],
  );
  const [sequence, setSequence] = useState(changes.length),
    [message, setMessage] = useState<string | null>(null);
  const update = (key: number, patch: Partial<ModificationDraft>) =>
    setChanges((previous) =>
      previous.map((m) => (m.key === key ? { ...m, ...patch } : m)),
    );
  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        setMessage(null);
        try {
          if (!name.trim()) throw new Error("Enter an option name.");
          const parsed = parseRecoveryCost(
            costKnown
              ? { kind: "editing", text: cost }
              : { kind: "not_entered" },
            state.document!.currency,
          );
          if (!parsed.ok)
            throw new Error(
              parsed.errors.map((error) => error.message).join(" "),
            );
          if (approval === "confirmed" && !context.trim())
            throw new Error(
              "Record externally verified context before confirming approval.",
            );
          const modifications: RecoveryModification[] = changes.map(
            (change) => ({
              activityId: change.activityId,
              field: change.field,
              operation: change.operation,
              valueMinutes: signedMinute(change.value),
            }),
          );
          const keys = modifications.map((m) => `${m.activityId}:${m.field}`);
          if (new Set(keys).size !== keys.length)
            throw new Error(
              "Each activity and field may be changed only once per option.",
            );
          const approvalRequirements = requirements
            .split("\n")
            .filter((line) => line.trim())
            .map((line) => {
              const [approverLabel, ...condition] = line.split("|");
              if (!approverLabel.trim() || !condition.join("|").trim())
                throw new Error(
                  "Each approval requirement needs an approver and condition separated by |.",
                );
              return {
                approverLabel: approverLabel.trim(),
                condition: condition.join("|").trim(),
              };
            });
          const source = {
            name,
            description: description || null,
            currency: state.document!.currency,
            costMinorUnits: parsed.value,
            modifications,
            approvalStatus: approval,
            approvalContext: context || null,
            approvalRequirements,
            assumptionNotes: assumptions
              .split("\n")
              .filter((line) => line.trim()),
          };
          const result = option
            ? dispatch({
                type: "recovery.edit",
                expectedIncidentId: incidentId,
                id: option.id,
                patch: source,
              })
            : dispatch({
                type: "recovery.add",
                expectedIncidentId: incidentId,
                option: source,
              });
          if (result.ok) done();
          else
            setMessage(result.errors.map((error) => error.message).join(" "));
        } catch (error) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Check the recovery inputs.",
          );
        }
      }}
    >
      <Field
        label="Option name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <TextArea
        label="Option description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <Choice
        label="Cost estimate state"
        value={costKnown ? "entered" : "unknown"}
        onChange={(e) => setCostKnown(e.target.value === "entered")}
      >
        <option value="unknown">Not entered (unknown)</option>
        <option value="entered">Enter an estimate</option>
      </Choice>
      {costKnown && (
        <Field
          label={`Additional cost (${state.document!.currency})`}
          inputMode="decimal"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          hint="Decimal text is parsed exactly to safe integer minor units. No exponent, negative amount or FX conversion. Enter 0 only for a known zero estimate."
        />
      )}
      <Choice
        label="Approval status"
        value={approval}
        onChange={(e) => setApproval(e.target.value as ApprovalStatus)}
      >
        <option value="pending">Pending</option>
        <option value="confirmed">Confirmed externally</option>
        <option value="not_required">Not required</option>
      </Choice>
      <TextArea
        label="External approval context"
        value={context}
        onChange={(e) => setContext(e.target.value)}
        placeholder="Who confirmed what, and when?"
      />
      <TextArea
        label="Approval requirements (approver | condition, one per line)"
        value={requirements}
        onChange={(e) => setRequirements(e.target.value)}
      />
      <fieldset className="min-w-0 space-y-4 border p-4">
        <legend className="px-2 text-sm font-semibold">
          Independent recovery changes
        </legend>
        {changes.map((change, index) => (
          <div key={change.key} className="space-y-4 border-b pb-5">
            <p className="font-mono text-xs">Change {index + 1}</p>
            <Choice
              label={`Change ${index + 1} activity`}
              value={change.activityId}
              onChange={(e) =>
                update(change.key, { activityId: e.target.value })
              }
            >
              {baseline.activities.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} · {a.classification}
                </option>
              ))}
            </Choice>
            <Choice
              label={`Change ${index + 1} field`}
              value={change.field}
              onChange={(e) =>
                update(change.key, {
                  field: e.target.value as RecoveryModification["field"],
                })
              }
            >
              <option value="earliest_start">Permissible earliest start</option>
              <option value="duration">Duration</option>
            </Choice>
            <Choice
              label={`Change ${index + 1} operation`}
              value={change.operation}
              onChange={(e) =>
                update(change.key, {
                  operation: e.target.value as "set" | "add",
                })
              }
            >
              <option value="set">Replace with</option>
              <option value="add">Add signed minutes</option>
            </Choice>
            <Field
              label={`Change ${index + 1} value (elapsed minutes)`}
              inputMode="text"
              value={change.value}
              onChange={(e) => update(change.key, { value: e.target.value })}
              hint={
                change.field === "earliest_start"
                  ? "Set replaces the permissible start constraint, measured from the production reference. Dependencies can still push the actual start later."
                  : "Duration changes to protected activities are rejected by the engine."
              }
            />
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() =>
                setChanges((previous) =>
                  previous.filter((m) => m.key !== change.key),
                )
              }
            >
              Remove change {index + 1}
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          className="min-h-11"
          disabled={!baseline.activities.length}
          onClick={() => {
            setChanges((previous) => [
              ...previous,
              {
                key: sequence,
                activityId: baseline.activities[0].id,
                field: "earliest_start",
                operation: "set",
                value: "0",
              },
            ]);
            setSequence(sequence + 1);
          }}
        >
          + Add change
        </Button>
      </fieldset>
      <TextArea
        label="Assumptions (one per line)"
        value={assumptions}
        onChange={(e) => setAssumptions(e.target.value)}
      />
      <Errors message={message} />
      <Button type="submit" className="min-h-12">
        Save option draft
      </Button>
    </form>
  );
}
export function RecoveryEditor({
  option,
  disabled = false,
}: {
  option?: RecoveryOption;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (disabled)
    return (
      <Button variant="outline" className="min-h-11" disabled>
        + Add alternative
      </Button>
    );
  return (
    <Editor
      label={option ? "Edit option" : "+ Add alternative"}
      title={option ? `Edit ${option.name}` : "Create independent alternative"}
      description="A draft changes no other option. Save the draft, then Apply option and Compare. Editing clears the current preference."
      open={open}
      onOpenChange={setOpen}
    >
      {open && <RecoveryForm option={option} done={() => setOpen(false)} />}
    </Editor>
  );
}
