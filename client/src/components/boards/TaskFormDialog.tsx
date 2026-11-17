import { useState, type FormEvent } from "react";
import { Sparkles, X } from "lucide-react";
import { suggestTaskFields } from "../../api/agents";
import { extractErrorMessage } from "../../api/client";
import type { BoardMemberDto, BoardTaskDto } from "../../types/board";

const inputClasses =
  "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/15";
const labelClasses = "flex flex-col gap-1 text-sm text-slate-600";

export interface TaskFormValues {
  title: string;
  description: string;
  assigneeEmployeeId: string;
  dueDate: string;
}

interface TaskFormDialogProps {
  boardId: string;
  members: BoardMemberDto[];
  task?: BoardTaskDto;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (values: TaskFormValues) => void;
  onClose: () => void;
}

export function TaskFormDialog({ boardId, members, task, isSubmitting, error, onSubmit, onClose }: TaskFormDialogProps) {
  const [values, setValues] = useState<TaskFormValues>({
    title: task?.title ?? "",
    description: task?.description ?? "",
    assigneeEmployeeId: task?.assigneeEmployeeId ?? "",
    dueDate: task?.dueDate ?? "",
  });
  const [touchedAssignee, setTouchedAssignee] = useState(false);
  const [touchedDueDate, setTouchedDueDate] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [assigneeReason, setAssigneeReason] = useState<string | null>(null);
  const [dueDateReason, setDueDateReason] = useState<string | null>(null);
  const [priorityHint, setPriorityHint] = useState<{ label: string; reason: string | null } | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!values.title.trim()) return;
    onSubmit(values);
  }

  async function handleSuggest() {
    if (!values.title.trim() || isSuggesting) return;
    setIsSuggesting(true);
    setSuggestError(null);
    try {
      const suggestion = await suggestTaskFields(boardId, {
        titleDraft: values.title,
        descriptionDraft: values.description || undefined,
      });

      if (!touchedAssignee && !values.assigneeEmployeeId && suggestion.suggestedAssigneeEmployeeId) {
        setValues((prev) => ({ ...prev, assigneeEmployeeId: suggestion.suggestedAssigneeEmployeeId! }));
        setAssigneeReason(suggestion.suggestedAssigneeReason);
      }
      if (!touchedDueDate && !values.dueDate && suggestion.suggestedDueDate) {
        setValues((prev) => ({ ...prev, dueDate: suggestion.suggestedDueDate! }));
        setDueDateReason(suggestion.suggestedDueDateReason);
      }
      if (suggestion.suggestedPriorityLabel) {
        setPriorityHint({ label: suggestion.suggestedPriorityLabel, reason: suggestion.suggestedPriorityReason });
      }
    } catch (err) {
      setSuggestError(extractErrorMessage(err));
    } finally {
      setIsSuggesting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink-950/60 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl font-['Inter']">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">{task ? "Edit task" : "New task"}</h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className={labelClasses}>
            <span className="flex items-center justify-between gap-2">
              Title
              <button
                type="button"
                disabled={!values.title.trim() || isSuggesting}
                onClick={handleSuggest}
                className="flex items-center gap-1 text-[11px] font-medium text-gold-700 transition-colors hover:underline disabled:cursor-not-allowed disabled:text-slate-400 disabled:no-underline"
              >
                <Sparkles className="h-3 w-3" />
                {isSuggesting ? "Suggesting..." : "Suggest"}
              </button>
            </span>
            <input
              required
              autoFocus
              value={values.title}
              onChange={(e) => setValues((prev) => ({ ...prev, title: e.target.value }))}
              className={inputClasses}
            />
          </label>
          <label className={labelClasses}>
            Description (optional)
            <textarea
              rows={2}
              value={values.description}
              onChange={(e) => setValues((prev) => ({ ...prev, description: e.target.value }))}
              className={inputClasses}
            />
          </label>
          {suggestError && <p className="text-xs text-red-600">{suggestError}</p>}
          {priorityHint && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-gold-500/40 bg-gold-500/10 px-3 py-2 text-xs text-gold-700">
              <span>
                Suggested priority: <strong>{priorityHint.label}</strong>
                {priorityHint.reason && <span className="text-gold-700"> — {priorityHint.reason}</span>}
              </span>
              <button
                type="button"
                onClick={() => setPriorityHint(null)}
                aria-label="Dismiss"
                className="shrink-0 text-gold-700 hover:text-gold-600"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <label className={labelClasses}>
            Assign to
            <select
              value={values.assigneeEmployeeId}
              onChange={(e) => {
                setTouchedAssignee(true);
                setAssigneeReason(null);
                setValues((prev) => ({ ...prev, assigneeEmployeeId: e.target.value }));
              }}
              className={inputClasses}
            >
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.employeeId} value={member.employeeId}>
                  {member.employeeName}
                </option>
              ))}
            </select>
            {assigneeReason && <span className="text-xs text-slate-500">{assigneeReason}</span>}
          </label>
          <label className={labelClasses}>
            Due date (optional)
            <input
              type="date"
              value={values.dueDate}
              onChange={(e) => {
                setTouchedDueDate(true);
                setDueDateReason(null);
                setValues((prev) => ({ ...prev, dueDate: e.target.value }));
              }}
              className={inputClasses}
            />
            {dueDateReason && <span className="text-xs text-slate-500">{dueDateReason}</span>}
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="mt-1 flex items-center gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-gold-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gold-500 disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : task ? "Save changes" : "Create task"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-500 hover:text-slate-600 hover:underline"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
