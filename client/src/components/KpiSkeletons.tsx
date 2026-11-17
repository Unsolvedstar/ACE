// Loading placeholders for the KPI page, ports of Collabrio's SkeletonStatCard/SkeletonRow.

export function KpiSkeletonStat() {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-slate-100" />
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
        <div className="h-5 w-2/5 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}

export function KpiSkeletonCard() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border-l-4 border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 animate-pulse rounded-full bg-slate-100" />
          <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="h-10 w-10 animate-pulse rounded-full bg-slate-100" />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="h-1.5 w-full animate-pulse rounded-full bg-slate-100" />
        <div className="h-1.5 w-full animate-pulse rounded-full bg-slate-100" />
        <div className="h-1.5 w-full animate-pulse rounded-full bg-slate-100" />
      </div>
    </div>
  );
}

export function KpiSkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-slate-100" />
      <div className="flex flex-1 flex-col gap-1.5">
        <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
        <div className="h-2.5 w-1/5 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="h-5 w-14 shrink-0 animate-pulse rounded bg-slate-100" />
    </div>
  );
}
