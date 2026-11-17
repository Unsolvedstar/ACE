import { Play } from "lucide-react";
import { WorkflowRunStatus, WorkflowRunStatusColors, WorkflowRunStatusLabels } from "../../types/workflow";

interface RunStatusOverlayProps {
  status: WorkflowRunStatus | null;
  errorMessage?: string | null;
  isTriggering: boolean;
  onRun: () => void;
}

export function RunStatusOverlay({ status, errorMessage, isTriggering, onRun }: RunStatusOverlayProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5">
      <button
        type="button"
        onClick={onRun}
        disabled={isTriggering}
        className="flex items-center gap-1.5 rounded-lg bg-gold-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-gold-500 disabled:opacity-50"
      >
        <Play className="h-3.5 w-3.5" />
        {isTriggering ? "Starting..." : "Run now"}
      </button>
      {status !== null && (
        <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: WorkflowRunStatusColors[status] }}>
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: WorkflowRunStatusColors[status] }} />
          {WorkflowRunStatusLabels[status]}
        </span>
      )}
      {errorMessage && <span className="truncate text-xs text-red-600">{errorMessage}</span>}
    </div>
  );
}
