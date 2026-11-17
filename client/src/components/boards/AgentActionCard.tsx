import { useState } from "react";
import { Check, X } from "lucide-react";
import {
  AgentActionStatus,
  AgentActionStatusColors,
  AgentActionStatusLabels,
  AgentToolNameLabels,
  type AgentActionAuditDto,
} from "../../types/agent";

interface AgentActionCardProps {
  action: AgentActionAuditDto;
  canDecide: boolean;
  onApprove: (actionId: string) => void;
  onReject: (actionId: string, reason?: string) => void;
  isBusy?: boolean;
}

export function AgentActionCard({ action, canDecide, onApprove, onReject, isBusy }: AgentActionCardProps) {
  const [isRejecting, setIsRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const color = AgentActionStatusColors[action.status];
  const isPending = action.status === AgentActionStatus.Proposed;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          {AgentToolNameLabels[action.toolName]}
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ backgroundColor: `${color}26`, color }}
        >
          {AgentActionStatusLabels[action.status]}
        </span>
      </div>
      <p className="text-sm text-slate-800">{action.summary}</p>
      {action.resultDetail && !isPending && <p className="text-xs text-slate-500">{action.resultDetail}</p>}
      {action.decidedByEmployeeName && (
        <p className="text-[11px] text-slate-400">
          Decided by {action.decidedByEmployeeName}
          {action.decidedAtUtc && ` on ${new Date(action.decidedAtUtc).toLocaleDateString()}`}
        </p>
      )}

      {isPending && canDecide && (
        <div className="flex flex-col gap-2">
          {isRejecting && (
            <input
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (optional)"
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-gold-500 focus:outline-none"
            />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onApprove(action.id)}
              className="flex items-center gap-1 rounded-lg bg-gold-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-gold-500 disabled:opacity-50"
            >
              <Check className="h-3 w-3" />
              Approve
            </button>
            {isRejecting ? (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => onReject(action.id, reason || undefined)}
                className="flex items-center gap-1 rounded-lg border border-red-300 px-2.5 py-1 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                <X className="h-3 w-3" />
                Confirm reject
              </button>
            ) : (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => setIsRejecting(true)}
                className="text-xs text-slate-500 hover:text-slate-600 hover:underline"
              >
                Reject
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
