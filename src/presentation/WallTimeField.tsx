import { useState } from "react";
import type { Event } from "@/engine";
import { Choice } from "@/presentation/forms";
import { DateField } from "@/presentation/DateField";
import { resolveLocalTime } from "@/presentation/app/time";

export function useWallTime(initial: string, event: Event) {
  const [value, setValue] = useState(initial),
    [chosen, setChosen] = useState("");
  const [candidates, setCandidates] = useState<readonly string[]>([]);
  const read = () => {
    const result = resolveLocalTime(event, value, chosen);
    if (!result.ok) {
      setCandidates(result.candidates ?? []);
      throw new Error(result.message);
    }
    return result.minute;
  };
  return {
    read,
    field: (label: string) => (
      <>
        <DateField
          label={label}
          dateTime
          value={value}
          onChange={(next) => {
            setValue(next);
            setChosen("");
            setCandidates([]);
          }}
          hint={`${event.timezone}. Uses the selected date, including overnight schedules. Whole minutes only.`}
        />
        {!!candidates.length && (
          <Choice
            label={`${label}: UTC occurrence`}
            value={chosen}
            onChange={(e) => setChosen(e.target.value)}
          >
            <option value="">Choose the UTC occurrence</option>
            {candidates.map((iso) => (
              <option key={iso}>{iso}</option>
            ))}
          </Choice>
        )}
      </>
    ),
  };
}
