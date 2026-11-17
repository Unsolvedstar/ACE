import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Clock, Plus, ShieldAlert } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { getSignature } from "../api/account";
import { extractErrorMessage } from "../api/client";
import {
  createKpiAppraisal,
  downloadKpiAppraisalPdf,
  getAllKpiAppraisals,
  getKpiAppraisalById,
  getKpiAppraisalsPendingMySignOff,
  getKpiTemplates,
  getManagedKpiAppraisals,
  getMyKpiAppraisals,
} from "../api/kpi";
import { KpiAppraisalSummaryCard } from "../components/KpiAppraisalSummaryCard";
import { KpiAvatar } from "../components/KpiAvatar";
import { KpiScoreEntryPanel } from "../components/KpiScoreEntryPanel";
import { KpiSignOffPanel } from "../components/KpiSignOffPanel";
import { KpiSkeletonCard, KpiSkeletonRow, KpiSkeletonStat } from "../components/KpiSkeletons";
import { KpiStatusBadge } from "../components/KpiStatusBadge";
import { StepForm, type WizardStep } from "../components/StepForm";
import { useCountUp } from "../lib/useCountUp";
import { EmployeeRole } from "../types/auth";
import { KpiAppraisalStatus, type KpiAppraisalDetailDto, type KpiAppraisalSummaryDto, type KpiTemplateSummaryDto } from "../types/kpi";
import { sanitizeEmployeeNumber } from "../utils/textInput";

const initialForm = {
  employeeNumber: "",
  kpiTemplateId: "",
  periodLabel: "",
  inductionNumber: "",
  blastingOfficerEmployeeNumber: "",
  blastingEngineerEmployeeNumber: "",
  checkpoint1Date: "",
  checkpoint2Date: "",
  checkpoint3Date: "",
  checkpoint4Date: "",
};

interface StatPillProps {
  label: string;
  value: number | null;
  icon: typeof ClipboardList;
  color: string;
}

function StatPill({ label, value, icon: Icon, color }: StatPillProps) {
  const animated = useCountUp(value);
  return (
    <div
      className="flex items-center gap-2 rounded-3xl border px-4 py-2"
      style={{ backgroundColor: `${color}1f`, borderColor: `${color}40` }}
    >
      <Icon className="h-4 w-4" style={{ color }} />
      <span className="text-sm font-semibold" style={{ color }}>
        {animated ?? "—"}
      </span>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );
}

export function KpiAppraisalsPage() {
  const { session } = useAuth();
  const isHR = session?.role === EmployeeRole.HR;
  const isLineManager = session?.role === EmployeeRole.LineManager;

  const [myAppraisals, setMyAppraisals] = useState<KpiAppraisalSummaryDto[]>([]);
  const [managedAppraisals, setManagedAppraisals] = useState<KpiAppraisalSummaryDto[]>([]);
  const [allAppraisals, setAllAppraisals] = useState<KpiAppraisalSummaryDto[]>([]);
  const [pendingSignOff, setPendingSignOff] = useState<KpiAppraisalSummaryDto[]>([]);
  const [templates, setTemplates] = useState<KpiTemplateSummaryDto[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(true);

  const [selectedAppraisal, setSelectedAppraisal] = useState<KpiAppraisalDetailDto | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [hasSavedSignature, setHasSavedSignature] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const requests: Promise<unknown>[] = [
        getMyKpiAppraisals().then(setMyAppraisals),
        getKpiAppraisalsPendingMySignOff().then(setPendingSignOff),
      ];
      if (isLineManager) requests.push(getManagedKpiAppraisals().then(setManagedAppraisals));
      if (isHR) {
        requests.push(getAllKpiAppraisals().then(setAllAppraisals));
        requests.push(getKpiTemplates().then(setTemplates));
      }
      await Promise.all(requests);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoadingLists(false);
    }
  }, [isLineManager, isHR]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    getSignature()
      .then((signature) => setHasSavedSignature(signature.hasSignature))
      .catch(() => {
        // Assume a signature exists so the pad doesn't flash in for the common case.
      });
  }, []);

  const statsSource = isHR ? allAppraisals : isLineManager ? managedAppraisals : myAppraisals;
  const stats = useMemo(
    () => ({
      total: statsSource.length,
      inProgress: statsSource.filter((a) => a.status === KpiAppraisalStatus.InProgress).length,
      finalized: statsSource.filter((a) => a.status === KpiAppraisalStatus.Finalized).length,
      pendingMySignOff: pendingSignOff.length,
    }),
    [statsSource, pendingSignOff],
  );

  async function handleScoreClick(id: string) {
    setIsLoadingDetail(true);
    setError(null);
    try {
      const detail = await getKpiAppraisalById(id);
      setSelectedAppraisal(detail);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoadingDetail(false);
    }
  }

  async function handleScoreSaved(updated: KpiAppraisalDetailDto) {
    setSelectedAppraisal(updated);
    await loadAll();
  }

  async function handleSignOffComplete() {
    setHasSavedSignature(true);
    await loadAll();
  }

  async function handleCreateSubmit() {
    setError(null);
    setIsSubmitting(true);
    try {
      await createKpiAppraisal({
        employeeNumber: form.employeeNumber,
        kpiTemplateId: form.kpiTemplateId,
        periodLabel: form.periodLabel,
        inductionNumber: form.inductionNumber || undefined,
        blastingOfficerEmployeeNumber: form.blastingOfficerEmployeeNumber,
        blastingEngineerEmployeeNumber: form.blastingEngineerEmployeeNumber,
        checkpoint1Date: form.checkpoint1Date || undefined,
        checkpoint2Date: form.checkpoint2Date || undefined,
        checkpoint3Date: form.checkpoint3Date || undefined,
        checkpoint4Date: form.checkpoint4Date || undefined,
      });
      setForm(initialForm);
      setIsCreateOpen(false);
      await loadAll();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClasses =
    "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/15";
  const labelClasses = "flex flex-col gap-1 text-sm text-slate-600";

  const createSteps: WizardStep[] = [
    {
      title: "Employee & template",
      validate: () =>
        !form.employeeNumber || !form.kpiTemplateId || !form.periodLabel ? "Please fill in all fields." : null,
      content: (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={labelClasses}>
            Employee number
            <input
              required
              value={form.employeeNumber}
              onChange={(e) => setForm((prev) => ({ ...prev, employeeNumber: sanitizeEmployeeNumber(e.target.value) }))}
              className={inputClasses}
            />
          </label>
          <label className={labelClasses}>
            KPI template (designation)
            <select
              required
              value={form.kpiTemplateId}
              onChange={(e) => setForm((prev) => ({ ...prev, kpiTemplateId: e.target.value }))}
              className={inputClasses}
            >
              <option value="">Select a template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.designation} ({template.itemCount} items)
                </option>
              ))}
            </select>
          </label>
          <label className={labelClasses}>
            Period (e.g. 2026)
            <input
              required
              value={form.periodLabel}
              onChange={(e) => setForm((prev) => ({ ...prev, periodLabel: e.target.value }))}
              className={inputClasses}
            />
          </label>
          <label className={labelClasses}>
            Induction number (optional)
            <input
              value={form.inductionNumber}
              onChange={(e) => setForm((prev) => ({ ...prev, inductionNumber: e.target.value }))}
              className={inputClasses}
            />
          </label>
        </div>
      ),
    },
    {
      title: "Sign-off & schedule",
      validate: () =>
        !form.blastingOfficerEmployeeNumber || !form.blastingEngineerEmployeeNumber
          ? "Please provide both sign-off employee numbers."
          : null,
      content: (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className={labelClasses}>
            Blasting Officer employee number
            <input
              required
              value={form.blastingOfficerEmployeeNumber}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, blastingOfficerEmployeeNumber: sanitizeEmployeeNumber(e.target.value) }))
              }
              className={inputClasses}
            />
          </label>
          <label className={labelClasses}>
            Blasting Engineer employee number
            <input
              required
              value={form.blastingEngineerEmployeeNumber}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, blastingEngineerEmployeeNumber: sanitizeEmployeeNumber(e.target.value) }))
              }
              className={inputClasses}
            />
          </label>
          {(["checkpoint1Date", "checkpoint2Date", "checkpoint3Date", "checkpoint4Date"] as const).map((field, i) => (
            <label key={field} className={labelClasses}>
              Review {i + 1} date (optional)
              <input
                type="date"
                value={form[field]}
                onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))}
                className={inputClasses}
              />
            </label>
          ))}
        </div>
      ),
    },
  ];

  async function handleTableDownload(appraisal: KpiAppraisalSummaryDto) {
    try {
      await downloadKpiAppraisalPdf(appraisal.id, `kpi-appraisal-${appraisal.employeeName}-${appraisal.periodLabel}.pdf`);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }

  return (
    <div className="stagger-children flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {isLoadingLists ? (
            <>
              <KpiSkeletonStat />
              <KpiSkeletonStat />
              <KpiSkeletonStat />
              <KpiSkeletonStat />
            </>
          ) : (
            <>
              <StatPill label="Total" value={stats.total} icon={ClipboardList} color="#8e9195" />
              <StatPill label="In progress" value={stats.inProgress} icon={Clock} color="#f5a83c" />
              <StatPill label="Pending your sign-off" value={stats.pendingMySignOff} icon={ShieldAlert} color="#c65a5a" />
              <StatPill label="Finalized" value={stats.finalized} icon={CheckCircle2} color="#1ecb8f" />
            </>
          )}
        </div>
        {isHR && (
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-gold-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gold-500"
          >
            <Plus className="h-4 w-4" />
            New appraisal
          </button>
        )}
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink-950/60 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl font-['Inter']">
            <h3 className="mb-4 text-sm font-semibold text-slate-900">Create KPI appraisal</h3>
            {templates.length === 0 ? (
              <p className="text-sm text-slate-500">No KPI templates available yet.</p>
            ) : (
              <StepForm
                theme="dark"
                steps={createSteps}
                onSubmit={handleCreateSubmit}
                submitLabel="Create appraisal"
                submittingLabel="Creating..."
                isSubmitting={isSubmitting}
                error={error}
              />
            )}
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="mt-3 text-xs text-slate-500 hover:text-slate-600 hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {pendingSignOff.length > 0 && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-slate-900">Pending your sign-off</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pendingSignOff.map((appraisal) => (
              <KpiAppraisalSummaryCard
                key={appraisal.id}
                appraisal={appraisal}
                onError={setError}
                footer={
                  <KpiSignOffPanel
                    appraisal={appraisal}
                    hasSavedSignature={hasSavedSignature}
                    onSigned={() => void handleSignOffComplete()}
                    onError={setError}
                  />
                }
              />
            ))}
          </div>
        </section>
      )}

      {selectedAppraisal && (
        <KpiScoreEntryPanel
          appraisal={selectedAppraisal}
          onSaved={handleScoreSaved}
          onCancel={() => setSelectedAppraisal(null)}
        />
      )}

      {isLineManager && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-slate-900">My team's appraisals</h3>
          {isLoadingLists ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <KpiSkeletonCard />
              <KpiSkeletonCard />
            </div>
          ) : managedAppraisals.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white px-6 py-8 text-center text-sm text-slate-500">
              No appraisals for your team yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {managedAppraisals.map((appraisal) => (
                <KpiAppraisalSummaryCard
                  key={appraisal.id}
                  appraisal={appraisal}
                  onError={setError}
                  actions={
                    <button
                      type="button"
                      disabled={isLoadingDetail}
                      onClick={() => handleScoreClick(appraisal.id)}
                      className="rounded-lg bg-gold-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-gold-500 disabled:opacity-50"
                    >
                      Score
                    </button>
                  }
                />
              ))}
            </div>
          )}
        </section>
      )}

      {isHR && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-slate-900">All appraisals</h3>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-900">
                    <th className="px-4 py-3 font-semibold">Employee</th>
                    <th className="px-4 py-3 font-semibold">Designation / Period</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Score</th>
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {isLoadingLists ? (
                    <tr>
                      <td colSpan={5}>
                        <KpiSkeletonRow />
                        <KpiSkeletonRow />
                        <KpiSkeletonRow />
                      </td>
                    </tr>
                  ) : allAppraisals.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        No appraisals created yet.
                      </td>
                    </tr>
                  ) : (
                    allAppraisals.map((appraisal) => (
                      <tr key={appraisal.id} className="transition-colors hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <KpiAvatar name={appraisal.employeeName} size={28} />
                            <span className="font-medium text-slate-900">{appraisal.employeeName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {appraisal.designation} — {appraisal.periodLabel}
                        </td>
                        <td className="px-4 py-3">
                          <KpiStatusBadge status={appraisal.status} />
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {appraisal.overallScorePercent === null ? "—" : `${appraisal.overallScorePercent}%`}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleTableDownload(appraisal)}
                              className="rounded-lg border border-gold-500/40 px-2.5 py-1 text-[11px] font-medium text-gold-700 transition-colors hover:bg-gold-500/10"
                            >
                              PDF
                            </button>
                            <button
                              type="button"
                              disabled={isLoadingDetail}
                              onClick={() => handleScoreClick(appraisal.id)}
                              className="rounded-lg border border-slate-300 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                            >
                              Score
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-slate-900">My KPI appraisals</h3>
        {isLoadingLists ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <KpiSkeletonCard />
          </div>
        ) : myAppraisals.length === 0 ? (
          <p className="rounded-xl border border-slate-200 bg-white px-6 py-8 text-center text-sm text-slate-500">
            No KPI appraisals yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {myAppraisals.map((appraisal) => (
              <KpiAppraisalSummaryCard key={appraisal.id} appraisal={appraisal} onError={setError} />
            ))}
          </div>
        )}
      </section>

      {error && !isCreateOpen && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
