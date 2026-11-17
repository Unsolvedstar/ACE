import { formatDateTime } from "../../lib/format";
import { WorkflowRunStatusColors, WorkflowRunStatusLabels, type WorkflowRunDto } from "../../types/workflow";

interface RunHistoryListProps {
  runs: WorkflowRunDto[];
  activeRunId: string | null;
  onSelect: (runId: string) => void;
}

export function RunHistoryList({ runs, activeRunId, onSelect }: RunHistoryListProps) {
  if (runs.length === 0) {
    return <p className="px-1 text-xs text-slate-500">No runs yet. Click "Run now" to try this workflow.</p>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {runs.map((run) => (
        <button
          key={run.id}
          type="button"
          onClick={() => onSelect(run.id)}
          className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
            run.id === activeRunId ? "border-gold-500/40 bg-gold-500/10" : "border-slate-200 bg-white hover:bg-slate-50"
          }`}
        >
          <span className="flex items-center gap-1.5 font-medium" style={{ color: WorkflowRunStatusColors[run.status] }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: WorkflowRunStatusColors[run.status] }} />
            {WorkflowRunStatusLabels[run.status]}
          </span>
          <span className="text-slate-500">{formatDateTime(run.queuedAtUtc)}</span>
        </button>
      ))}
    </div>
  );
}
