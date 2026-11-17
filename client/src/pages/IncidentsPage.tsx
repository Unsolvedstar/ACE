import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { extractErrorMessage } from "../api/client";
import { getAllIncidentReports, getMyIncidentReports, submitIncidentReport, updateIncidentStatus } from "../api/incidents";
import { AttachmentsPanel } from "../components/AttachmentsPanel";
import { IncidentReviewQueue } from "../components/IncidentReviewQueue";
import { IncidentSeverityBadge } from "../components/IncidentSeverityBadge";
import { IncidentStatusBadge } from "../components/IncidentStatusBadge";
import { StepForm, type WizardStep } from "../components/StepForm";
import { formatDateTime } from "../lib/format";
import { AttachmentEntityType } from "../types/attachment";
import { EmployeeRole } from "../types/auth";
import { IncidentSeverity, IncidentSeverityLabels, IncidentStatus, type IncidentReportDto } from "../types/incident";

interface IncidentForm {
  title: string;
  severity: IncidentSeverity;
  location: string;
  occurredAt: string;
  description: string;
}

function nowForDateTimeLocal(): string {
  const now = new Date();
  now.setSeconds(0, 0);
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

function initialForm(): IncidentForm {
  return { title: "", severity: IncidentSeverity.Low, location: "", occurredAt: nowForDateTimeLocal(), description: "" };
}

export function IncidentsPage() {
  const { session } = useAuth();
  const canReview = session
    ? [EmployeeRole.SafetyOfficer, EmployeeRole.HR, EmployeeRole.Executive].includes(session.role)
    : false;

  const [myReports, setMyReports] = useState<IncidentReportDto[]>([]);
  const [allReports, setAllReports] = useState<IncidentReportDto[]>([]);
  const [form, setForm] = useState(initialForm());
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const requests: Promise<unknown>[] = [getMyIncidentReports().then(setMyReports)];
      if (canReview) {
        requests.push(getAllIncidentReports().then(setAllReports));
      }
      await Promise.all(requests);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }, [canReview]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);
    try {
      await submitIncidentReport({
        title: form.title,
        description: form.description,
        severity: form.severity,
        location: form.location,
        occurredAtUtc: new Date(form.occurredAt).toISOString(),
      });
      setForm(initialForm());
      await loadAll();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAdvance(id: string, status: IncidentStatus, reviewNotes: string) {
    setIsBusy(true);
    try {
      await updateIncidentStatus(id, { status, reviewNotes: reviewNotes || undefined });
      await loadAll();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsBusy(false);
    }
  }

  const steps: WizardStep[] = [
    {
      title: "What happened",
      validate: () => (!form.title || !form.location ? "Please fill in all fields." : null),
      content: (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-slate-700 sm:col-span-2">
            Title
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/15"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Severity
            <select
              value={form.severity}
              onChange={(e) => setForm((prev) => ({ ...prev, severity: Number(e.target.value) as IncidentSeverity }))}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/15"
            >
              {Object.entries(IncidentSeverityLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Location
            <input
              value={form.location}
              onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/15"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            When did it happen?
            <input
              type="datetime-local"
              max={nowForDateTimeLocal()}
              value={form.occurredAt}
              onChange={(e) => setForm((prev) => ({ ...prev, occurredAt: e.target.value }))}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/15"
            />
          </label>
        </div>
      ),
    },
    {
      title: "Description",
      validate: () => (!form.description ? "Please describe what happened." : null),
      content: (
        <label className="flex flex-col gap-1 text-sm text-slate-700">
          Description
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/15"
          />
        </label>
      ),
    },
  ];

  return (
    <div className="stagger-children flex flex-col gap-6">
      {canReview && <IncidentReviewQueue items={allReports} isBusy={isBusy} canManage={canReview} onAdvance={handleAdvance} />}

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">Report an incident or near miss</h3>
        <StepForm
          steps={steps}
          onSubmit={handleSubmit}
          submitLabel="Submit report"
          submittingLabel="Submitting..."
          isSubmitting={isSubmitting}
          error={error}
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-sm font-semibold text-slate-900">My reports</h3>
        </div>
        {myReports.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-slate-500">No incidents reported yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {myReports.map((report) => (
              <li key={report.id} className="px-6 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-slate-900">{report.title}</p>
                  <IncidentSeverityBadge severity={report.severity} />
                  <IncidentStatusBadge status={report.status} />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {report.location} · {formatDateTime(report.occurredAtUtc)}
                </p>
                {report.reviewNotes && (
                  <p className="mt-1.5 text-xs text-slate-500">
                    <span className="font-medium">Review notes:</span> {report.reviewNotes}
                  </p>
                )}
                <AttachmentsPanel entityType={AttachmentEntityType.IncidentReport} entityId={report.id} canUpload compact />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
