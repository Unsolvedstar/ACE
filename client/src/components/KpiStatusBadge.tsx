import { KpiAppraisalStatus, KpiAppraisalStatusLabels } from "../types/kpi";

// Collabrio chip tokens: small pill, alpha-tinted background + matching border/text.
const toneByStatus: Record<KpiAppraisalStatus, { bg: string; text: string; dot: string }> = {
  [KpiAppraisalStatus.InProgress]: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-300" },
  [KpiAppraisalStatus.PendingBlastingEngineerSignOff]: { bg: "bg-amber-50", text: "text-amber-600", dot: "bg-amber-500" },
  [KpiAppraisalStatus.Finalized]: { bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-500" },
};

export function KpiStatusBadge({ status }: { status: KpiAppraisalStatus }) {
  const tone = toneByStatus[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone.bg} ${tone.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
      {KpiAppraisalStatusLabels[status]}
    </span>
  );
}
