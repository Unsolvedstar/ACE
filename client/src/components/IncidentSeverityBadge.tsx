import { IncidentSeverity, IncidentSeverityLabels } from "../types/incident";

const SEVERITY_CLASSES: Record<IncidentSeverity, string> = {
  [IncidentSeverity.Low]: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-300/60",
  [IncidentSeverity.Medium]: "bg-gold-500/10 text-gold-700 ring-1 ring-inset ring-gold-500/30",
  [IncidentSeverity.High]: "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-300/60",
  [IncidentSeverity.Critical]: "bg-red-50 text-red-800 ring-1 ring-inset ring-red-300/60",
};

export function IncidentSeverityBadge({ severity }: { severity: IncidentSeverity }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${SEVERITY_CLASSES[severity]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {IncidentSeverityLabels[severity]}
    </span>
  );
}
