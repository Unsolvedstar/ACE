import { useState } from "react";
import { AttachmentsPanel } from "./AttachmentsPanel";
import { IncidentSeverityBadge } from "./IncidentSeverityBadge";
import { IncidentStatusBadge } from "./IncidentStatusBadge";
import { formatDateTime } from "../lib/format";
import { AttachmentEntityType } from "../types/attachment";
import { IncidentStatus, type IncidentReportDto } from "../types/incident";

interface IncidentReviewQueueProps {
  items: IncidentReportDto[];
  isBusy: boolean;
  canManage: boolean;
  onAdvance: (id: string, status: IncidentStatus, reviewNotes: string) => void;
}

// What a reviewer can move an incident to next, from its current status — mirrors the
// backend's "strictly forward, skipping stages is fine" rule.
const NEXT_STATUS_OPTIONS: Partial<Record<IncidentStatus, { status: IncidentStatus; label: string }[]>> = {
  [IncidentStatus.Reported]: [
    { status: IncidentStatus.UnderInvestigation, label: "Start investigation" },
    { status: IncidentStatus.Closed, label: "Close" },
  ],
  [IncidentStatus.UnderInvestigation]: [{ status: IncidentStatus.Closed, label: "Close" }],
};

export function IncidentReviewQueue({ items, isBusy, canManage, onAdvance }: IncidentReviewQueueProps) {
  const [actioning, setActioning] = useState<{ id: string; status: IncidentStatus } | null>(null);
  const [notes, setNotes] = useState("");

  function startAction(id: string, status: IncidentStatus) {
    setActioning({ id, status });
    setNotes("");
  }

  function confirmAction() {
    if (!actioning) return;
    onAdvance(actioning.id, actioning.status, notes);
    setActioning(null);
    setNotes("");
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h3 className="text-sm font-semibold text-slate-900">Incident review queue</h3>
      </div>
      {items.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-slate-500">No incidents reported.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((item) => {
            const nextOptions = NEXT_STATUS_OPTIONS[item.status];
            return (
              <li key={item.id} className="px-6 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-slate-900">{item.title}</p>
                      <IncidentSeverityBadge severity={item.severity} />
                      <IncidentStatusBadge status={item.status} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.employeeName} · {item.location} · {formatDateTime(item.occurredAtUtc)}
                    </p>
                    <p className="mt-1.5 text-sm text-slate-600">{item.description}</p>
                    {item.reviewNotes && (
                      <p className="mt-1.5 text-xs text-slate-500">
                        <span className="font-medium">Review notes:</span> {item.reviewNotes}
                      </p>
                    )}
                  </div>
                  {canManage && nextOptions && (
                    <div className="flex shrink-0 gap-2">
                      {nextOptions.map((option) => (
                        <button
                          key={option.status}
                          type="button"
                          disabled={isBusy}
                          onClick={() => startAction(item.id, option.status)}
                          className={`rounded-md px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 ${
                            option.status === IncidentStatus.Closed
                              ? "bg-emerald-600 hover:bg-emerald-500"
                              : "bg-gold-600 hover:bg-gold-500"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <AttachmentsPanel entityType={AttachmentEntityType.IncidentReport} entityId={item.id} canUpload={canManage} compact />

                {actioning?.id === item.id && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      placeholder="Review notes (optional)"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="min-w-[240px] flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/15"
                    />
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={confirmAction}
                      className="rounded-md bg-gold-600 px-3 py-1 text-xs font-medium text-white hover:bg-gold-500 disabled:opacity-50"
                    >
                      Confirm
                    </button>
                    <button type="button" onClick={() => setActioning(null)} className="text-xs text-slate-500 hover:underline">
                      Cancel
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
