import {
  Handle,
  Position,
  ReactFlow,
  Controls,
  useNodesState,
} from "@xyflow/react";
import type { Edge, Node, NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { activities, graphConnections } from "@/presentation/sample";
import { Kicker } from "@/presentation/shared";

type ActivityNode = Node<{ label: string; detail: string }, "activity">;
function ActivityCard({ data }: NodeProps<ActivityNode>) {
  return (
    <div className="w-[190px] space-y-3 border bg-card p-4 text-sm">
      <Handle type="target" position={Position.Left} />
      <p className="font-semibold">{data.label}</p>
      <p className="text-xs text-muted-foreground">{data.detail}</p>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
const nodeTypes = { activity: ActivityCard };
const positions = [
  { x: 0, y: 70 },
  { x: 235, y: 0 },
  { x: 235, y: 140 },
  { x: 470, y: 70 },
  { x: 705, y: 70 },
  { x: 940, y: 70 },
];
const initialNodes: ActivityNode[] = activities.map((a, i) => ({
  id: a.id,
  type: "activity",
  position: positions[i],
  data: {
    label: a.name,
    detail:
      a.id === "testing"
        ? "60 min · protected"
        : a.id === "doors"
          ? "17:00 deadline"
          : `${a.duration} min`,
  },
  ariaLabel: `${a.name}. ${a.duration} minutes. Predecessors: ${a.predecessors}.`,
  focusable: true,
}));
const edges: Edge<Record<string, never>, "smoothstep">[] = graphConnections.map(
  ([id, source, target]) => ({
    id,
    source,
    target,
    type: "smoothstep",
    style: { stroke: "var(--primary)" },
    ariaLabel: `${source} precedes ${target}`,
  }),
);
export function DependencyGraph() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  return (
    <section
      className="space-y-4 bg-secondary p-4 md:p-5"
      aria-label="Activity dependency explorer"
    >
      <Kicker>Relationship inspection / finish → start / lag 0 min</Kicker>
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
          minZoom={0.25}
          maxZoom={1.5}
          proOptions={{ hideAttribution: false }}
        >
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <p className="text-sm">
        Power → Audio AND Lighting → System Testing → Full Rehearsal → Doors
        Open.
      </p>
      <p className="text-xs text-muted-foreground">
        Both parallel setups must finish before Testing. Dragging changes this
        view only. This is not critical-path analysis.
      </p>
    </section>
  );
}
