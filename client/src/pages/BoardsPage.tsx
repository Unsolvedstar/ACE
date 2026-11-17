import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { createBoard, getMyBoards } from "../api/boards";
import { extractErrorMessage } from "../api/client";
import { BoardCard } from "../components/boards/BoardCard";
import { BoardMemberPicker } from "../components/boards/BoardMemberPicker";
import { KpiSkeletonCard } from "../components/KpiSkeletons";
import { StepForm, type WizardStep } from "../components/StepForm";
import { BoardPriority, BoardPriorityLabels, type BoardDto } from "../types/board";

const inputClasses =
  "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/15";
const labelClasses = "flex flex-col gap-1 text-sm text-slate-600";

export function BoardsPage() {
  const { session } = useAuth();

  const [boards, setBoards] = useState<BoardDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<BoardPriority>(BoardPriority.Normal);
  const [deadline, setDeadline] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadBoards = useCallback(async () => {
    try {
      setBoards(await getMyBoards());
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBoards();
  }, [loadBoards]);

  function resetForm() {
    setName("");
    setDescription("");
    setPriority(BoardPriority.Normal);
    setDeadline("");
    setMemberIds([]);
  }

  async function handleCreateSubmit() {
    setError(null);
    setIsSubmitting(true);
    try {
      await createBoard({
        name,
        description: description || undefined,
        priority,
        deadline: deadline || undefined,
        initialMemberEmployeeIds: memberIds,
      });
      resetForm();
      setIsCreateOpen(false);
      await loadBoards();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  const createSteps: WizardStep[] = [
    {
      title: "Board details",
      validate: () => (!name.trim() ? "Please give the board a name." : null),
      content: (
        <div className="flex flex-col gap-3">
          <label className={labelClasses}>
            Board name
            <input required autoFocus value={name} onChange={(e) => setName(e.target.value)} className={inputClasses} />
          </label>
          <label className={labelClasses}>
            Description (optional)
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className={inputClasses} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className={labelClasses}>
              Priority
              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value) as BoardPriority)}
                className={inputClasses}
              >
                {Object.entries(BoardPriorityLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClasses}>
              Deadline (optional)
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputClasses} />
            </label>
          </div>
        </div>
      ),
    },
    {
      title: "Who's on this board?",
      content: (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-slate-500">You're added automatically. Pick anyone else who should have access.</p>
          <BoardMemberPicker
            selectedIds={memberIds}
            onChange={setMemberIds}
            excludeEmployeeIds={session ? [session.employeeId] : []}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="stagger-children flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Boards</h2>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-gold-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gold-500"
        >
          <Plus className="h-4 w-4" />
          New board
        </button>
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink-950/60 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl font-['Inter']">
            <h3 className="mb-4 text-sm font-semibold text-slate-900">Create board</h3>
            <StepForm
              theme="dark"
              steps={createSteps}
              onSubmit={handleCreateSubmit}
              submitLabel="Create board"
              submittingLabel="Creating..."
              isSubmitting={isSubmitting}
              error={error}
            />
            <button
              type="button"
              onClick={() => {
                setIsCreateOpen(false);
                resetForm();
              }}
              className="mt-3 text-xs text-slate-500 hover:text-slate-600 hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <KpiSkeletonCard />
          <KpiSkeletonCard />
          <KpiSkeletonCard />
        </div>
      ) : boards.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white px-6 py-8 text-center text-sm text-slate-500">
          No boards yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {boards.map((board) => (
            <BoardCard key={board.id} board={board} />
          ))}
        </div>
      )}

      {error && !isCreateOpen && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
