import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, Workflow as WorkflowIcon } from "lucide-react";
import { createWorkflow, deleteWorkflow, getMyWorkflows, setWorkflowEnabled } from "../api/workflows";
import { extractErrorMessage } from "../api/client";
import { ConfirmDialog } from "../components/ConfirmDialog";
import type { WorkflowSummaryDto } from "../types/workflow";

const inputClasses =
  "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/15";
const labelClasses = "flex flex-col gap-1 text-sm text-slate-600";

export function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowSummaryDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadWorkflows = useCallback(async () => {
    try {
      setWorkflows(await getMyWorkflows());
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  async function handleCreate() {
    if (!name.trim()) {
      setError("Please give the workflow a name.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await createWorkflow({ name, description: description || undefined });
      setName("");
      setDescription("");
      setIsCreateOpen(false);
      await loadWorkflows();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleEnabled(workflow: WorkflowSummaryDto) {
    try {
      await setWorkflowEnabled(workflow.id, { isEnabled: !workflow.isEnabled });
      await loadWorkflows();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }

  async function handleDelete() {
    if (!pendingDeleteId) return;
    setIsDeleting(true);
    try {
      await deleteWorkflow(pendingDeleteId);
      setPendingDeleteId(null);
      await loadWorkflows();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Build automations that run on demand, then trigger them with one click.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-gold-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gold-500"
        >
          <Plus className="h-4 w-4" />
          New workflow
        </button>
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink-950/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="mb-4 text-sm font-semibold text-slate-900">Create workflow</h3>
            <div className="flex flex-col gap-3">
              <label className={labelClasses}>
                Name
                <input required autoFocus value={name} onChange={(e) => setName(e.target.value)} className={inputClasses} />
              </label>
              <label className={labelClasses}>
                Description (optional)
                <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className={inputClasses} />
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="mt-1 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setError(null);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-600 hover:underline"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isSubmitting}
                  className="rounded-lg bg-gold-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gold-500 disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Create workflow"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {pendingDeleteId && (
        <ConfirmDialog
          title="Delete workflow"
          message="This permanently deletes the workflow and its run history. This can't be undone."
          confirmLabel="Delete"
          isBusy={isDeleting}
          onConfirm={handleDelete}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : workflows.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white px-6 py-8 text-center text-sm text-slate-500">
          No workflows yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workflows.map((workflow) => (
            <div
              key={workflow.id}
              className="flex flex-col gap-3 rounded-xl border-l-4 border-l-gold-600 bg-white p-4 shadow-lg transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl"
            >
              <Link to={`/workflows/${workflow.id}`} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-slate-900">
                    <WorkflowIcon className="h-3.5 w-3.5 shrink-0 text-gold-700" />
                    {workflow.name}
                  </p>
                  <p className="truncate text-xs text-slate-500">Owned by {workflow.ownerEmployeeName}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    workflow.isEnabled ? "bg-gold-500/10 text-gold-700" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {workflow.isEnabled ? "Enabled" : "Disabled"}
                </span>
              </Link>

              {workflow.description && <p className="line-clamp-2 text-xs text-slate-600">{workflow.description}</p>}

              <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleToggleEnabled(workflow)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-50"
                >
                  {workflow.isEnabled ? "Disable" : "Enable"}
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDeleteId(workflow.id)}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-red-600 transition-colors hover:bg-red-500/10"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && !isCreateOpen && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
