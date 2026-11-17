import { useCallback, type DragEvent } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type OnEdgesChange,
  type OnNodesChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { workflowNodeTypes } from "./nodes";
import { WORKFLOW_NODE_DRAG_TYPE } from "./NodePalette";
import { WorkflowNodeType } from "../../types/workflow";

interface WorkflowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: (connection: Connection) => void;
  onAddNode: (nodeType: WorkflowNodeType, position: { x: number; y: number }) => void;
  onNodeClick: (nodeId: string) => void;
  onPaneClick: () => void;
}

export function WorkflowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onAddNode,
  onNodeClick,
  onPaneClick,
}: WorkflowCanvasProps) {
  const { screenToFlowPosition } = useReactFlow();

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const nodeType = event.dataTransfer.getData(WORKFLOW_NODE_DRAG_TYPE) as WorkflowNodeType | "";
      if (!nodeType) return;

      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      onAddNode(nodeType, position);
    },
    [onAddNode, screenToFlowPosition],
  );

  return (
    <div className="h-full w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50" onDrop={handleDrop} onDragOver={handleDragOver}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={workflowNodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => onNodeClick(node.id)}
        onPaneClick={onPaneClick}
        colorMode="dark"
        fitView
      >
        <Background gap={16} color="#ffffff14" />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable className="!bg-slate-100" maskColor="#00000080" />
      </ReactFlow>
    </div>
  );
}
