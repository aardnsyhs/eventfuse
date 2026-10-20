import { lazy, Suspense, useId, useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  calendarDate,
  calendarValue,
  calendarDateLib,
} from "@/presentation/app/calendar-date";

const Calendar = lazy(() =>
  import("@/components/ui/calendar").then((module) => ({
    default: module.Calendar,
  })),
);

export function DateField({
  label,
  value,
  onChange,
  dateTime = false,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  dateTime?: boolean;
  hint?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const selected = calendarDate(dateTime ? value.slice(0, 10) : value);
  const readable = selected?.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id} className="font-mono text-xs text-muted-foreground">
        {label}
      </Label>
      <div className="flex items-start gap-2">
        <Input
          id={id}
          value={value}
          placeholder={dateTime ? "YYYY-MM-DDTHH:mm" : "YYYY-MM-DD"}
          aria-describedby={`${id}-hint`}
          onChange={(e) => onChange(e.target.value)}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={<Button variant="outline" size="icon" />}
            aria-label={`Choose ${label.toLowerCase()}${readable ? `: ${readable}` : ""}`}
          >
            <CalendarIcon aria-hidden="true" />
          </PopoverTrigger>
          <PopoverContent
            align="start"
            collisionPadding={0}
            initialFocus={() =>
              document.querySelector<HTMLElement>(
                '[data-slot="popover-content"] [data-selected-single="true"], [data-slot="popover-content"] [role="grid"] button[tabindex="0"]',
              ) ?? false
            }
            className="max-h-(--available-height) w-[min(23rem,100vw)] max-w-(--available-width) overflow-auto p-0 sm:p-2"
          >
            <PopoverTitle className="sr-only">
              Choose {label.toLowerCase()}
            </PopoverTitle>
            <Suspense fallback={<p role="status">Opening calendar…</p>}>
              <Calendar
                className="p-0 sm:p-1"
                mode="single"
                required
                dateLib={calendarDateLib}
                autoFocus
                selected={selected}
                defaultMonth={selected}
                captionLayout="dropdown"
                startMonth={calendarDate(
                  `${Math.min(1900, selected?.getFullYear() ?? 1900)
                    .toString()
                    .padStart(4, "0")}-01-01`,
                )}
                endMonth={calendarDate(
                  `${Math.max(2100, selected?.getFullYear() ?? 2100)}-12-01`,
                )}
                onSelect={(date) => {
                  onChange(
                    calendarValue(date) +
                      (dateTime ? value.slice(10) || "T00:00" : ""),
                  );
                  setOpen(false);
                }}
              />
            </Suspense>
          </PopoverContent>
        </Popover>
      </div>
      <p id={`${id}-hint`} className="text-xs text-muted-foreground">
        {readable ?? "Enter YYYY-MM-DD or choose a calendar date."} ·{" "}
        {hint ?? "Calendar date only; the event timezone stays unchanged."}
      </p>
    </div>
  );
}
