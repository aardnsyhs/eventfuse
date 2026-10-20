import { memo, useCallback, useMemo, useState } from "react";
import { Handle, Position, ReactFlow, Controls, applyNodeChanges } from "@xyflow/react";
import type {
  Edge,
  Node,
  NodeProps,
  OnNodesChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { BaselineSnapshot } from "@/engine";
import { Kicker } from "@/presentation/shared";
import { useTheme } from "@/presentation/app/theme";

type ActivityNode = Node<{ label: string; detail: string }, "activity">;

const ActivityCard = memo(function ActivityCard({
  data,
}: NodeProps<ActivityNode>) {
  return (
    <div className="w-[190px] space-y-2 rounded border border-border bg-card p-3.5 text-sm shadow-xs transition-colors hover:border-primary/50">
      <Handle
        type="target"
        position={Position.Left}
        className="!size-2 !rounded-full !bg-primary !border-2 !border-card"
      />
      <p className="font-semibold text-card-foreground leading-snug break-words">
        {data.label}
      </p>
      <p className="font-mono text-xs text-muted-foreground">{data.detail}</p>
      <Handle
        type="source"
        position={Position.Right}
        className="!size-2 !rounded-full !bg-primary !border-2 !border-card"
      />
    </div>
  );
});

const nodeTypes = { activity: ActivityCard };

function syncNodes(
  currentNodes: ActivityNode[],
  activities: BaselineSnapshot["activities"],
): ActivityNode[] {
  const existingMap = new Map(currentNodes.map((n) => [n.id, n]));
  return activities.map((activity, index) => {
    const existing = existingMap.get(activity.id);
    const data = {
      label: activity.name,
      detail: `${activity.durationMinutes} min · ${activity.classification}`,
    };
    const ariaLabel = `${activity.name}. ${activity.durationMinutes} minutes.`;

    if (existing) {
      return {
        ...existing,
        data,
        ariaLabel,
      };
    }

    return {
      id: activity.id,
      type: "activity" as const,
      position: {
        x: index * 235,
        y: (index % 2) * 130,
      },
      initialWidth: 190,
      data,
      ariaLabel,
      focusable: true,
    };
  });
}

export function DependencyGraph({ baseline }: { baseline: BaselineSnapshot }) {
  const { resolvedTheme } = useTheme();
  const [nodes, setNodes] = useState<ActivityNode[]>(() =>
    syncNodes([], baseline.activities),
  );
  const [prevActivities, setPrevActivities] = useState(baseline.activities);

  if (prevActivities !== baseline.activities) {
    setPrevActivities(baseline.activities);
    setNodes((current) => syncNodes(current, baseline.activities));
  }

  const edges: Edge<Record<string, never>, "smoothstep">[] = useMemo(
    () =>
      baseline.dependencies.map((d) => ({
        id: d.id,
        source: d.predecessorId,
        target: d.successorId,
        type: "smoothstep",
        label: `${d.lagMinutes} min`,
        style: { stroke: "var(--primary)" },
        ariaLabel: `${d.predecessorId} precedes ${d.successorId}, lag ${d.lagMinutes} minutes`,
      })),
    [baseline.dependencies],
  );

  const onNodesChange: OnNodesChange<ActivityNode> = useCallback((changes) => {
    setNodes((current) => applyNodeChanges(changes, current));
  }, []);

  return (
    <section
      className="space-y-4 rounded-lg bg-secondary p-4 md:p-5"
      aria-label="Activity dependency explorer"
    >
      <Kicker>Relationship inspection / finish → start</Kicker>
      <div className="h-[300px] min-w-0 rounded border border-border bg-card/50 overflow-hidden">
        <ReactFlow<ActivityNode>
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          nodesConnectable={false}
          edgesReconnectable={false}
          deleteKeyCode={null}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.1}
          maxZoom={1.5}
          colorMode={resolvedTheme}
        >
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <ul className="space-y-2 text-sm" aria-label="Dependency list">
        {baseline.dependencies.map((d) => (
          <li key={d.id} className="text-foreground">
            {baseline.activities.find((a) => a.id === d.predecessorId)?.name ??
              d.predecessorId}{" "}
            →{" "}
            {baseline.activities.find((a) => a.id === d.successorId)?.name ??
              d.successorId}{" "}
            · lag {d.lagMinutes} min
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Dragging changes this view only. The list is the keyboard and mobile
        alternative. This is not critical-path analysis.
      </p>
    </section>
  );
}
