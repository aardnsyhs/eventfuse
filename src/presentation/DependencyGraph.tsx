import { useState } from "react";
import { Handle, Position, ReactFlow, Controls } from "@xyflow/react";
import type {
  Edge,
  Node,
  NodeProps,
  NodeChange,
  XYPosition,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { BaselineSnapshot } from "@/engine";
import { Kicker } from "@/presentation/shared";

type ActivityNode = Node<{ label: string; detail: string }, "activity">;
function ActivityCard({ data }: NodeProps<ActivityNode>) {
  return (
    <div className="w-[190px] space-y-3 border border-muted-foreground bg-card p-4 text-sm">
      <Handle type="target" position={Position.Left} />
      <p className="font-semibold">{data.label}</p>
      <p className="text-xs text-muted-foreground">{data.detail}</p>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
const nodeTypes = { activity: ActivityCard };
export function DependencyGraph({ baseline }: { baseline: BaselineSnapshot }) {
  const [positions, setPositions] = useState<Record<string, XYPosition>>({});
  const nodes: ActivityNode[] = baseline.activities.map((activity, index) => ({
    id: activity.id,
    type: "activity",
    position: positions[activity.id] ?? {
      x: index * 235,
      y: (index % 2) * 130,
    },
    data: {
      label: activity.name,
      detail: `${activity.durationMinutes} min · ${activity.classification}`,
    },
    ariaLabel: `${activity.name}. ${activity.durationMinutes} minutes.`,
    focusable: true,
  }));
  const edges: Edge<Record<string, never>, "smoothstep">[] =
    baseline.dependencies.map((d) => ({
      id: d.id,
      source: d.predecessorId,
      target: d.successorId,
      type: "smoothstep",
      label: `${d.lagMinutes} min`,
      style: { stroke: "var(--primary)" },
      ariaLabel: `${d.predecessorId} precedes ${d.successorId}, lag ${d.lagMinutes} minutes`,
    }));
  const onNodesChange = (changes: NodeChange<ActivityNode>[]) => {
    if (
      !changes.some((change) => change.type === "position" && change.position)
    )
      return;
    setPositions((previous) => {
      const next = { ...previous };
      for (const change of changes)
        if (change.type === "position" && change.position)
          next[change.id] = change.position;
      return next;
    });
  };
  return (
    <section
      className="space-y-4 bg-secondary p-4 md:p-5"
      aria-label="Activity dependency explorer"
    >
      <Kicker>Relationship inspection / finish → start</Kicker>
      <div className="h-[300px] min-w-0">
        <ReactFlow<ActivityNode>
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          nodesConnectable={false}
          edgesReconnectable={false}
          deleteKeyCode={null}
          fitView
          minZoom={0.1}
          maxZoom={1.5}
        >
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <ul className="space-y-2 text-sm" aria-label="Dependency list">
        {baseline.dependencies.map((d) => (
          <li key={d.id}>
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
