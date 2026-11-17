import { Minus, ShieldAlert, TrendingDown, TrendingUp } from "lucide-react";
import { SafetyRiskBand, SafetyRiskBandLabels, SafetyRiskTrend, type SiteSafetyRiskDto } from "../types/reports";

interface SiteSafetyRiskPanelProps {
  sites: SiteSafetyRiskDto[];
}

const BAND_BADGE_CLASSES: Record<SafetyRiskBand, string> = {
  [SafetyRiskBand.Low]: "bg-emerald-100 text-emerald-700",
  [SafetyRiskBand.Moderate]: "bg-gold-500/15 text-gold-700",
  [SafetyRiskBand.Elevated]: "bg-orange-100 text-orange-700",
  [SafetyRiskBand.Critical]: "bg-red-100 text-red-700",
};

const BAND_BAR_CLASSES: Record<SafetyRiskBand, string> = {
  [SafetyRiskBand.Low]: "bg-emerald-500",
  [SafetyRiskBand.Moderate]: "bg-gold-500",
  [SafetyRiskBand.Elevated]: "bg-orange-500",
  [SafetyRiskBand.Critical]: "bg-red-500",
};

function TrendIndicator({ trend }: { trend: SafetyRiskTrend }) {
  if (trend === SafetyRiskTrend.Rising) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
        <TrendingUp className="h-3.5 w-3.5" />
        Rising
      </span>
    );
  }
  if (trend === SafetyRiskTrend.Falling) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
        <TrendingDown className="h-3.5 w-3.5" />
        Falling
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
      <Minus className="h-3.5 w-3.5" />
      Stable
    </span>
  );
}

export function SiteSafetyRiskPanel({ sites }: SiteSafetyRiskPanelProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <ShieldAlert className="h-4 w-4 text-slate-400" />
          Site safety risk
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          A transparent risk score (0–100) per site from incident rate, PPE issuance backlog, and certificate expiry
          gaps — each measured relative to the average across your own sites, plus a 30-day incident trend. Not a
          black-box prediction: every factor behind a score is listed below it.
        </p>
      </div>

      {sites.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-slate-500">No active sites to assess yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {sites.map((site) => (
            <li key={site.siteId} className="px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">{site.siteName}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${BAND_BADGE_CLASSES[site.band]}`}>
                    {SafetyRiskBandLabels[site.band]}
                  </span>
                  <TrendIndicator trend={site.trend} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{site.activeEmployeeCount} active employees</span>
                  <span className="text-lg font-semibold tabular-nums text-slate-900">{site.score}</span>
                </div>
              </div>

              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${BAND_BAR_CLASSES[site.band]}`} style={{ width: `${site.score}%` }} />
              </div>

              <ul className="mt-2.5 flex flex-col gap-1">
                {site.contributors.map((contributor, index) => (
                  <li key={index} className="text-xs text-slate-500">
                    • {contributor}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
