import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Heading,
  LinkButton,
  Notice,
  Panel,
  Status,
} from "@/presentation/shared";
import { activities } from "@/presentation/sample";
import { ActivityEditor } from "@/presentation/ActivityEditor";
import { DependencyGraph } from "@/presentation/DependencyGraph";
import { Schedule } from "@/presentation/Schedule";

export function Blueprint() {
  return (
    <>
      <Heading eyebrow="Corporate Product Launch / baseline v1">
        The production blueprint
      </Heading>
      <div className="flex flex-col items-start gap-4 md:flex-row md:items-center">
        <Status tone="success">v1 · scenarios preserve this baseline</Status>
        <ActivityEditor />
        <Dialog>
          <DialogTrigger
            render={<Button variant="outline" className="min-h-11" />}
          >
            Open graph explorer ↗
          </DialogTrigger>
          <DialogContent className="rounded-none sm:max-w-[min(90vw,1200px)]">
            <DialogHeader>
              <DialogTitle>Inspect relationships</DialogTitle>
              <DialogDescription>
                The graph uses the fictional baseline. Moving a node changes
                layout only.
              </DialogDescription>
            </DialogHeader>
            <DependencyGraph />
          </DialogContent>
        </Dialog>
      </div>
      <Notice title="Schedule-ready is not safety-certified">
        All six activities meet the baseline deadline. System Testing is
        protected and stays 60 min. Inspect dependencies before recording a
        baseline revision.
      </Notice>
      <Schedule
        editAction={(activity) => <ActivityEditor activity={activity} />}
      />
      <div className="hidden md:block">
        <DependencyGraph />
      </div>
      <div className="space-y-4 md:hidden">
        <Panel>
          <h3>Inspect relationships</h3>
          <p>Power → Audio AND Lighting → Testing → Rehearsal → Doors.</p>
          <p className="text-sm">
            Audio and Lighting run in parallel. Testing waits for BOTH. This
            list is the accessible alternative to the graph.
          </p>
        </Panel>
      </div>
      <section className="hidden space-y-5 md:block">
        <h2>Activity constraints</h2>
        <Table>
          <TableHeader className="bg-foreground">
            <TableRow>
              <TableHead className="font-mono text-xs text-background">
                ACTIVITY / OWNER
              </TableHead>
              <TableHead className="font-mono text-xs text-background">
                EARLIEST / DURATION
              </TableHead>
              <TableHead className="font-mono text-xs text-background">
                PREDECESSORS / LAG
              </TableHead>
              <TableHead>
                <span className="sr-only">Editor</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="whitespace-normal py-5">
                  {a.name}
                  <p className="text-xs text-muted-foreground">{a.owner}</p>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {a.earliest} / {a.duration} min
                </TableCell>
                <TableCell className="whitespace-normal text-sm">
                  {a.predecessors} · 0 min
                </TableCell>
                <TableCell>
                  <ActivityEditor activity={a} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
      <div className="flex flex-wrap gap-4">
        <LinkButton to="scenario">Continue to Scenario Lab</LinkButton>
        <Button variant="outline" disabled className="min-h-11">
          Apply Baseline · Phase 3B
        </Button>
      </div>
    </>
  );
}
