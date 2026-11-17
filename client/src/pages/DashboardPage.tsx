import { useEffect, useState } from "react";
import { AlertTriangle, CalendarOff, GraduationCap, HeartPulse, TrendingUp, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getDashboardSummary } from "../api/dashboard";
import { getMyNotifications } from "../api/notifications";
import { extractErrorMessage } from "../api/client";
import { formatDate, formatDateTime } from "../lib/format";
import { useCountUp } from "../lib/useCountUp";
import { EmployeeRole } from "../types/auth";
import { NAV_ITEMS } from "../config/nav";
import { ShiftRequestStatus, ShiftRequestStatusLabels, ShiftTypeLabels } from "../types/workShift";
import type { DashboardSummary } from "../types/dashboard";
import type { NotificationDto } from "../types/notification";

function formatPercent(value: number | null): string {
  return value === null ? "—" : `${value}%`;
}

const SHIFT_STATUS_PILL_CLASSES: Record<ShiftRequestStatus, string> = {
  [ShiftRequestStatus.PendingLineManagerApproval]: "bg-amber-50 text-amber-700",
  [ShiftRequestStatus.PendingHRApproval]: "bg-amber-50 text-amber-700",
  [ShiftRequestStatus.Approved]: "bg-emerald-50 text-emerald-700",
  [ShiftRequestStatus.Rejected]: "bg-red-50 text-red-700",
};

interface StatTileProps {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
}

function StatTile({ label, value, detail, icon: Icon }: StatTileProps) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium leading-tight text-slate-500">{label}</p>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-semibold leading-none tracking-tight text-slate-900 sm:text-[28px]">{value}</p>
      <p className="mt-1.5 text-[11px] leading-snug text-slate-500">{detail}</p>
    </div>
  );
}

function RibbonPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <h3 className="px-4 pt-4 text-sm font-semibold text-slate-900">{title}</h3>
      <div className="pb-1.5 pt-2">{children}</div>
    </div>
  );
}

export function DashboardPage() {
  const { session } = useAuth();
  const firstName = session?.fullName.split(" ")[0] ?? "there";
  const isLineManager = session?.role === EmployeeRole.LineManager;

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [activity, setActivity] = useState<NotificationDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboardSummary()
      .then(setSummary)
      .catch((err) => setError(extractErrorMessage(err)));
    getMyNotifications()
      .then((data) => setActivity(data.slice(0, 6)))
      .catch(() => {
        // Non-fatal — the activity feed just stays empty.
      });
  }, []);

  const loadingDetail = error ?? "Loading...";

  const incidentsCount = useCountUp(summary ? summary.incidentsThisMonth : null);
  const medicalPercent = useCountUp(summary?.medicalCompliancePercent ?? null, 1);
  const trainingPercent = useCountUp(summary?.trainingCompliancePercent ?? null, 1);
  const pendingLeave = useCountUp(summary ? summary.pendingLeaveCount : null);
  const kpiScore = useCountUp(summary?.myKpiOverallScorePercent ?? null, 1);

  const moduleItems = NAV_ITEMS.filter(
    (item) =>
      item.path !== "/" &&
      item.path !== "/settings" &&
      (!item.roles || (session && item.roles.includes(session.role))),
  );

  return (
    <div className="stagger-children flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">Welcome back, {firstName}</h2>
        <p className="text-sm text-slate-500">Here's what's happening today.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
        <StatTile
          label="Incidents (MTD)"
          value={incidentsCount !== null ? String(incidentsCount) : "—"}
          detail={summary ? "Reported this month, org-wide" : loadingDetail}
          icon={AlertTriangle}
        />
        <StatTile
          label="Medical Compliance"
          value={formatPercent(medicalPercent)}
          detail={summary ? "Employees with a current fit status" : loadingDetail}
          icon={HeartPulse}
        />
        <StatTile
          label="Training Compliance"
          value={formatPercent(trainingPercent)}
          detail={summary ? "Certificates not yet expired" : loadingDetail}
          icon={GraduationCap}
        />
        <StatTile
          label="Leave Requests"
          value={pendingLeave !== null ? String(pendingLeave) : "—"}
          detail={summary ? (isLineManager ? "Pending your approval" : "Your pending requests") : loadingDetail}
          icon={CalendarOff}
        />
        <StatTile
          label="KPI Score"
          value={formatPercent(kpiScore)}
          detail={summary ? "Your latest KPI appraisal" : loadingDetail}
          icon={TrendingUp}
        />
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <RibbonPanel title="Recent Shift Requests">
          {!summary || summary.recentShiftRequests.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">
              {summary ? "No shift requests yet." : loadingDetail}
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-slate-100">
              {summary.recentShiftRequests.map((request) => (
                <li key={request.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{request.employeeName}</p>
                    <p className="text-xs text-slate-500">
                      {formatDate(request.requestedShiftDate)} — {ShiftTypeLabels[request.requestedShiftType]}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${SHIFT_STATUS_PILL_CLASSES[request.status]}`}
                  >
                    {ShiftRequestStatusLabels[request.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </RibbonPanel>

        <RibbonPanel title="Latest Activity">
          {activity.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">No recent activity.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-slate-100">
              {activity.map((entry) => (
                <li key={entry.id} className="px-4 py-3">
                  <p className="text-sm text-slate-700">{entry.message}</p>
                  <p className="text-xs text-slate-500">{formatDateTime(entry.createdAtUtc)}</p>
                </li>
              ))}
            </ul>
          )}
        </RibbonPanel>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <h3 className="px-4 pt-4 text-sm font-semibold text-slate-900">Core modules</h3>
        <div className="grid grid-cols-3 gap-2 p-3 sm:grid-cols-4 sm:gap-3 sm:p-4 lg:grid-cols-6">
          {moduleItems.map(({ path, label, icon: Icon, badge }) => (
            <Link
              key={path}
              to={path}
              className="group flex min-w-0 flex-col items-center gap-2 rounded-xl p-2.5 text-center transition-colors hover:bg-slate-50"
            >
              <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors group-hover:bg-gold-500/10 group-hover:text-gold-700">
                <Icon className="h-5 w-5" />
                {badge && (
                  <span className="absolute -right-2 -top-1.5 rounded-full bg-gold-600 px-1.5 text-[9px] font-semibold text-white">
                    {badge}
                  </span>
                )}
              </span>
              <span className="line-clamp-2 text-[11.5px] font-medium leading-tight text-slate-700">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
