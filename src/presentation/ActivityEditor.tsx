import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PreviewField, Status } from "@/presentation/shared";
import type { SampleActivity } from "@/presentation/sample";

export function ActivityEditor({ activity }: { activity?: SampleActivity }) {
  return (
    <Dialog>
      <DialogTrigger
        aria-label={activity ? `Edit ${activity.name}` : undefined}
        render={
          <Button
            variant={activity ? "outline" : "default"}
            className="min-h-11"
          />
        }
      >
        {activity ? "Edit" : "+ Create activity"}
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto rounded-none border p-6 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="pr-8 text-2xl font-semibold">
            {activity ? activity.name : "Create activity"}
          </DialogTitle>
          <DialogDescription>
            Activity editor preview. Source editing and Apply Baseline will be
            connected in Phase 3B.
          </DialogDescription>
        </DialogHeader>
        <PreviewField
          id={`name-${activity?.id ?? "new"}`}
          label="Activity name"
          value={activity?.name ?? ""}
        />
        <PreviewField
          id={`owner-${activity?.id ?? "new"}`}
          label="Assigned vendor or owner"
          value={activity?.owner ?? ""}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <PreviewField
            id={`start-${activity?.id ?? "new"}`}
            label="Earliest start · local time"
            value={activity?.earliest ?? ""}
          />
          <PreviewField
            id={`duration-${activity?.id ?? "new"}`}
            label="Duration · minutes"
            value={activity ? String(activity.duration) : ""}
          />
        </div>
        <PreviewField
          id={`dependency-${activity?.id ?? "new"}`}
          label="Predecessors · finish-to-start / zero lag"
          value={activity?.predecessors ?? ""}
        />
        {activity?.classification === "protected" && (
          <Status>Protected · duration cannot be shortened</Status>
        )}
        <Button disabled className="min-h-11">
          Save draft · available in Phase 3B
        </Button>
      </DialogContent>
    </Dialog>
  );
}
