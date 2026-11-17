import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "warning" | "good";
  icon?: LucideIcon;
  iconTone?: "blue" | "amber" | "emerald" | "red" | "violet";
}

const toneClasses: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "text-slate-900",
  warning: "text-gold-700",
  good: "text-emerald-600",
};

// "blue" and "violet" are kept as neutral/warm tones rather than saturated
// colors — red is reserved for danger/alert stats, so decorative (non-
// semantic) stat tiles stay muted while amber/emerald/red keep their meaning
// (warning/good/danger).
const iconToneClasses: Record<NonNullable<StatCardProps["iconTone"]>, string> = {
  blue: "bg-gradient-to-br from-slate-100 to-slate-200 text-stone-700",
  amber: "bg-gradient-to-br from-gold-500/10 to-gold-500/20 text-gold-700",
  emerald: "bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600",
  red: "bg-gradient-to-br from-red-50 to-red-100 text-red-600",
  violet: "bg-gradient-to-br from-stone-100 to-stone-200 text-stone-600",
};

const accentBarClasses: Record<NonNullable<StatCardProps["iconTone"]>, string> = {
  blue: "from-slate-200 to-slate-300",
  amber: "from-gold-300 to-gold-500",
  emerald: "from-emerald-400 to-emerald-500",
  red: "from-red-400 to-red-500",
  violet: "from-stone-300 to-stone-400",
};

export function StatCard({ label, value, detail, tone = "default", icon: Icon, iconTone = "blue" }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-white p-4 pt-5 shadow-sm">
      <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accentBarClasses[iconTone]}`} />
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        {Icon && (
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-sm ${iconToneClasses[iconTone]}`}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className={`mt-2 text-2xl font-semibold tracking-tight ${toneClasses[tone]}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}
