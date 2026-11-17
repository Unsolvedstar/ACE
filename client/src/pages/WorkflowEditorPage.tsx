import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { ReactFlowProvider, addEdge, useEdgesState, useNodesState, type Connection, type Edge, type Node } from "@xyflow/react";
import { getWorkflowById, updateWorkflow } from "../api/workflows";
import { getWorkflowRunById, getWorkflowRunHistory, triggerWorkflowRun } from "../api/workflowRuns";
import { extractErrorMessage } from "../api/client";
import { useWorkflowRunHub } from "../lib/useWorkflowRunHub";
import { WorkflowCanvas } from "../components/workflows/WorkflowCanvas";
import { NodePalette } from "../components/workflows/NodePalette";
import { NodeConfigPanel } from "../components/workflows/NodeConfigPanel";
import { RunStatusOverlay } from "../components/workflows/RunStatusOverlay";
import { RunHistoryList } from "../components/workflows/RunHistoryList";
import {
  ConditionOperator,
  WorkflowNodeType,
  WorkflowRunStatus,
  type WorkflowGraph,
  type WorkflowRunDto,
} from "../types/workflow";

function defaultDataFor(nodeType: WorkflowNodeType): Record<string, unknown> {
  switch (nodeType) {
    case WorkflowNodeType.Notification:
      return { label: "Send Notification", recipientEmployeeId: "", message: "" };
    case WorkflowNodeType.Webhook:
      return { label: "Call Webhook", url: "", payloadTemplate: "{}" };
    case WorkflowNodeType.BoardTask:
      return { label: "Create Board Task", boardId: "", title: "" };
    case WorkflowNodeType.Condition:
      return { label: "Condition", field: "", operator: ConditionOperator.Equals, value: "" };
    default:
      return { label: "Manual Trigger" };
  }
}

export function WorkflowEditorPage() {
  const { workflowId } = useParams<{ workflowId: string }>();

  const [name, setName] = useState("");
  const [description, setDescription] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [runs, setRuns] = useState<WorkflowRunDto[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const activeRun = useMemo(() => runs.find((r) => r.id === activeRunId) ?? null, [runs, activeRunId]);

  const loadWorkflow = useCallback(async () => {
    if (!workflowId) return;
    try {
      const workflow = await getWorkflowById(workflowId);
      setName(workflow.name);
      setDescription(workflow.description ?? undefined);
      const graph = JSON.parse(workflow.graphJson) as WorkflowGraph;
      setNodes(graph.nodes.map((n) => ({ id: n.id, type: n.type, position: n.position, data: n.data })));
      setEdges(graph.edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle ?? undefined })));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [workflowId, setNodes, setEdges]);

  const loadHistory = useCallback(async () => {
    if (!workflowId) return;
    try {
      const history = await getWorkflowRunHistory(workflowId);
      setRuns(history);
      if (history.length > 0 && !activeRunId) {
        setActiveRunId(history[0].id);
      }
    } catch (err) {
      setError(extractErrorMessage(err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId]);

  useEffect(() => {
    loadWorkflow();
    loadHistory();
  }, [loadWorkflow, loadHistory]);

  const refreshActiveRun = useCallback(async () => {
    if (!workflowId || !activeRunId) return;
    try {
      const run = await getWorkflowRunById(workflowId, activeRunId);
      setRuns((prev) => {
        const others = prev.filter((r) => r.id !== run.id);
        return [run, ...others].sort((a, b) => (a.queuedAtUtc < b.queuedAtUtc ? 1 : -1));
      });
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }, [workflowId, activeRunId]);

  useWorkflowRunHub(
    activeRunId ?? undefined,
    useCallback(() => {
      refreshActiveRun();
    }, [refreshActiveRun]),
    useCallback(() => {
      refreshActiveRun();
    }, [refreshActiveRun]),
  );

  // Fallback poll while a run is in flight: this workflow engine can finish a run in well under
  // a second, so the browser's SignalR connection frequently loses the race and joins the run's
  // group only after every event has already fired, leaving the UI stuck showing "Queued" with
  // nothing left to notify it. SignalR is a convenience layer, not the source of truth (same
  // philosophy as useBoardHub) - poll until the run reaches a terminal status.
  useEffect(() => {
    if (!activeRun || (activeRun.status !== WorkflowRunStatus.Queued && activeRun.status !== WorkflowRunStatus.Running)) {
      return;
    }
    const interval = setInterval(refreshActiveRun, 1000);
    return () => clearInterval(interval);
  }, [activeRun, refreshActiveRun]);

  // Reflect the active run's per-step status onto the matching canvas nodes so they light up
  // live as the run progresses (driven by refreshActiveRun above, not by the hub payload itself -
  // same "SignalR as a refetch trigger, not a data source" approach as useBoardHub).
  useEffect(() => {
    if (!activeRun) return;
    setNodes((prev) =>
      prev.map((node) => {
        const step = activeRun.steps.find((s) => s.nodeId === node.id);
        return step ? { ...node, data: { ...node.data, status: step.status } } : node;
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRun]);

  const handleAddNode = useCallback(
    (nodeType: WorkflowNodeType, position: { x: number; y: number }) => {
      const id = crypto.randomUUID();
      setNodes((prev) => [...prev, { id, type: nodeType, position, data: defaultDataFor(nodeType) }]);
    },
    [setNodes],
  );

  const handleConnect = useCallback(
    (connection: Connection) => setEdges((prev) => addEdge(connection, prev)),
    [setEdges],
  );

  const handleNodeDataChange = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes((prev) => prev.map((node) => (node.id === nodeId ? { ...node, data } : node)));
    },
    [setNodes],
  );

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

  async function handleSave() {
    if (!workflowId) return;
    setError(null);
    setIsSaving(true);
    try {
      const graph: WorkflowGraph = {
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type as WorkflowNodeType,
          position: n.position,
          data: { ...n.data, status: undefined },
        })),
        edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle ?? null })),
      };
      await updateWorkflow(workflowId, { name, description, graphJson: JSON.stringify(graph) });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRun() {
    if (!workflowId) return;
    setError(null);
    setIsTriggering(true);
    try {
      const run = await triggerWorkflowRun(workflowId);
      setRuns((prev) => [run, ...prev]);
      setActiveRunId(run.id);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsTriggering(false);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading...</p>;
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/workflows" className="text-slate-500 transition-colors hover:text-slate-700">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border-none bg-transparent text-lg font-semibold text-slate-900 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-3">
          <RunStatusOverlay
            status={activeRun ? activeRun.status : null}
            errorMessage={activeRun?.errorMessage}
            isTriggering={isTriggering}
            onRun={handleRun}
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex min-h-0 flex-1 gap-3">
        <NodePalette />

        <div className="min-w-0 flex-1">
          <ReactFlowProvider>
            <WorkflowCanvas
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={handleConnect}
              onAddNode={handleAddNode}
              onNodeClick={setSelectedNodeId}
              onPaneClick={() => setSelectedNodeId(null)}
            />
          </ReactFlowProvider>
        </div>

        <div className="flex w-72 shrink-0 flex-col gap-3">
          <NodeConfigPanel node={selectedNode} onChange={handleNodeDataChange} onClose={() => setSelectedNodeId(null)} />
          <div className="flex flex-col gap-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-100 p-3">
            <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Run history</p>
            <RunHistoryList runs={runs} activeRunId={activeRunId} onSelect={setActiveRunId} />
          </div>
        </div>
      </div>
    </div>
  );
}
