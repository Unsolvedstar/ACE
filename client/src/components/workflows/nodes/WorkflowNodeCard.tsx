import type { ReactNode } from "react";
import { Handle, Position } from "@xyflow/react";
import { WorkflowStepStatus, WorkflowStepStatusColors, WorkflowStepStatusLabels } from "../../../types/workflow";

interface SourceHandleSpec {
  id?: string;
  label?: string;
}

interface WorkflowNodeCardProps {
  icon: ReactNode;
  label: string;
  subtitle?: string;
  accentColor: string;
  status?: WorkflowStepStatus;
  selected?: boolean;
  showTargetHandle?: boolean;
  sourceHandles?: SourceHandleSpec[];
}

export function WorkflowNodeCard({
  icon,
  label,
  subtitle,
  accentColor,
  status,
  selected,
  showTargetHandle = true,
  sourceHandles = [{}],
}: WorkflowNodeCardProps) {
  return (
    <div
      className={`relative flex w-56 items-center gap-2.5 rounded-xl border-l-4 bg-white px-3 py-2.5 shadow-lg transition-shadow ${
        selected ? "ring-2 ring-gold-500/25" : ""
      }`}
      style={{ borderLeftColor: accentColor }}
    >
      {showTargetHandle && <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !border-0 !bg-slate-300" />}

      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${accentColor}26`, color: accentColor }}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-slate-900">{label}</p>
        {subtitle && <p className="truncate text-[10px] text-slate-500">{subtitle}</p>}
      </div>
      {status !== undefined && (
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: WorkflowStepStatusColors[status] }}
          title={WorkflowStepStatusLabels[status]}
        />
      )}

      {sourceHandles.map((handle, index) => {
        const topPercent = ((index + 1) * 100) / (sourceHandles.length + 1);
        return (
          <Handle
            key={handle.id ?? "default"}
            type="source"
            id={handle.id}
            position={Position.Right}
            style={sourceHandles.length > 1 ? { top: `${topPercent}%` } : undefined}
            className="!h-2.5 !w-2.5 !border-0 !bg-slate-300"
          >
            {handle.label && (
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 whitespace-nowrap text-[9px] font-medium text-slate-500">
                {handle.label}
              </span>
            )}
          </Handle>
        );
      })}
    </div>
  );
}
