import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Heading,
  Kicker,
  LinkButton,
  Notice,
  Panel,
  PreviewField,
  Status,
} from "@/presentation/shared";
import { activities, recoverySamples } from "@/presentation/sample";
import type { OptionId } from "@/presentation/sample";

function RecoveryCard({
  id,
  selected,
  onSelect,
}: {
  id: OptionId;
  selected: boolean;
  onSelect: () => void;
}) {
  const [expanded, setExpanded] = useState(false),
    reduced = useReducedMotion(),
    option = recoverySamples[id];
  return (
    <Panel className={selected ? "border-2 border-primary" : ""}>
      <Kicker>
        Option {id} / {selected ? "preferred proposal" : "alternative"}
      </Kicker>
      <h2 className="min-h-[60px]">{option.title}</h2>
      <Status tone="warning">Simulation · pending approval</Status>
      <div className="space-y-2 border-y py-5">
        <p className="text-[56px] leading-tight font-semibold tracking-[-1.5px]">
          {option.time}
        </p>
        <p className="font-semibold">
          Doors Open ·{" "}
          {option.breach === 0
            ? "on target, conditional"
            : "60 min deadline breach"}
        </p>
        <p className="font-mono text-sm">
          {option.recovered} min recovered vs incident 19:00
        </p>
      </div>
      <p className="min-h-11 font-semibold">{option.change}</p>
      <p className="min-h-16 text-sm">{option.condition}</p>
      <p className="text-sm md:hidden">Additional cost: Not entered · USD</p>
      <div className="hidden space-y-5 md:block">
        <PreviewField
          id={`cost-${id}`}
          label="Additional cost estimate"
          value="Not entered"
          hint="Unknown ≠ zero. Enter an estimate only when available."
        />
        <PreviewField
          id={`currency-${id}`}
          label="Currency"
          value="USD"
          hint="Currency selection does not imply an amount."
        />
      </div>
      <div className="space-y-2">
        <Kicker>Approval / recorded status only</Kicker>
        <p className="text-sm font-semibold">{option.approval}</p>
        <p className="text-xs text-muted-foreground">
          Pending / confirmed / not required records status, never authorization
          to proceed.
        </p>
      </div>
      <Separator />
      <Button
        variant="outline"
        className="min-h-11 h-auto w-full whitespace-normal py-3"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls={`option-detail-${id}`}
      >
        {expanded ? "Hide" : "View"} {id.toUpperCase()} timings & assumptions
      </Button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={`option-detail-${id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.15 }}
            className="space-y-4"
          >
            <Kicker>Details / example timings</Kicker>
            <dl>
              {activities.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-wrap justify-between gap-2 border-b py-3 text-sm"
                >
                  <dt>{a.name}</dt>
                  <dd className="font-mono text-xs">{a[id]}</dd>
                </div>
              ))}
            </dl>
            <p className="text-sm">
              {option.shifted} shifted activities vs baseline. Of 5 downstream
              activities, {option.downstreamShifted} shift.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      <Notice title="Protected constraints retained">
        System Testing stays 60 min. Full Rehearsal stays 120 min in these
        examples. No safety procedure is shortened.
      </Notice>
      <Button
        variant={selected ? "default" : "outline"}
        className="min-h-11 h-auto w-full whitespace-normal py-3"
        onClick={onSelect}
        aria-pressed={selected}
      >
        {selected
          ? "✓ Preferred proposal · not approved"
          : "Mark as preferred proposal"}
      </Button>
    </Panel>
  );
}
export function Compare({
  selected,
  onSelect,
}: {
  selected: OptionId | null;
  onSelect: (id: OptionId | null) => void;
}) {
  return (
    <>
      <Heading eyebrow="Recovery Compare / Power +240 min">
        Compare responses. Keep the conditions.
      </Heading>
      <div className="grid gap-6 bg-foreground p-5 text-background md:grid-cols-2 md:p-7">
        <div className="space-y-2">
          <Kicker className="text-secondary">
            Fixed reference / baseline v1
          </Kicker>
          <p className="text-[34px] font-semibold tracking-tight md:text-[44px]">
            17:00 Doors
          </p>
        </div>
        <div className="space-y-2">
          <Kicker className="text-danger-soft">
            Fixed reference / unmitigated incident
          </Kicker>
          <p className="text-[34px] font-semibold tracking-tight md:text-[44px]">
            19:00 · +120 min
          </p>
        </div>
      </div>
      <p>
        Two hypothetical alternatives, aligned to the same baseline and
        incident. Neither is ranked safest or optimal. A preference is a
        discussion proposal only.
      </p>
      <div className="grid gap-6 md:grid-cols-2">
        {(["a", "b"] as const).map((id) => (
          <RecoveryCard
            key={id}
            id={id}
            selected={selected === id}
            onSelect={() => onSelect(id)}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4 border p-4">
        <Button variant="outline" disabled className="min-h-11">
          + Add alternative
        </Button>
        <p className="text-xs text-muted-foreground">
          2 of 3 slots used. New alternatives and cost editing connect in Phase
          3B; no third result has been fabricated.
        </p>
      </div>
      <Notice title="Unknown cost travels with the proposal" tone="warning">
        Both costs are Not entered. Both approvals remain pending. These
        warnings must remain in the frozen decision brief and print output.
      </Notice>
      <div className="flex flex-wrap gap-4">
        {selected ? (
          <LinkButton to="brief">
            View example brief with proposal {selected.toUpperCase()}
          </LinkButton>
        ) : (
          <Button
            disabled
            className="min-h-11 h-auto max-w-full whitespace-normal py-3"
          >
            Select a proposal to view its example brief
          </Button>
        )}
        {selected && (
          <Button
            variant="outline"
            className="min-h-11"
            onClick={() => onSelect(null)}
          >
            Clear preference
          </Button>
        )}
      </div>
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {selected
          ? `Presentation preview: ${selected.toUpperCase()} preferred. Approval remains pending. This preference is not saved.`
          : "No proposal preferred. Nothing is selected automatically."}
      </p>
    </>
  );
}
