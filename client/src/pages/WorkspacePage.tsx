import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { createSpace, getMySpaces } from "../api/spaces";
import { extractErrorMessage } from "../api/client";
import { SpaceCard } from "../components/workspace/SpaceCard";
import { BoardMemberPicker } from "../components/boards/BoardMemberPicker";
import { KpiSkeletonCard } from "../components/KpiSkeletons";
import { StepForm, type WizardStep } from "../components/StepForm";
import type { SpaceDto } from "../types/space";

const inputClasses =
  "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/15";
const labelClasses = "flex flex-col gap-1 text-sm text-slate-600";

export function WorkspacePage() {
  const { session } = useAuth();

  const [spaces, setSpaces] = useState<SpaceDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadSpaces = useCallback(async () => {
    try {
      setSpaces(await getMySpaces());
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSpaces();
  }, [loadSpaces]);

  function resetForm() {
    setName("");
    setDescription("");
    setMemberIds([]);
  }

  async function handleCreateSubmit() {
    setError(null);
    setIsSubmitting(true);
    try {
      await createSpace({
        name,
        description: description || undefined,
        initialMemberEmployeeIds: memberIds,
      });
      resetForm();
      setIsCreateOpen(false);
      await loadSpaces();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  const createSteps: WizardStep[] = [
    {
      title: "Space details",
      validate: () => (!name.trim() ? "Please give the space a name." : null),
      content: (
        <div className="flex flex-col gap-3">
          <label className={labelClasses}>
            Space name
            <input required autoFocus value={name} onChange={(e) => setName(e.target.value)} className={inputClasses} />
          </label>
          <label className={labelClasses}>
            Description (optional)
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className={inputClasses} />
          </label>
        </div>
      ),
    },
    {
      title: "Who's in this space?",
      content: (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-slate-500">You're added automatically. Pick anyone else who should have access.</p>
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
        <div>
          <p className="text-xs text-slate-500">Spaces organize folders and boards for a team or project.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-gold-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gold-500"
        >
          <Plus className="h-4 w-4" />
          New space
        </button>
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink-950/60 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl font-['Inter']">
            <h3 className="mb-4 text-sm font-semibold text-slate-900">Create space</h3>
            <StepForm
              theme="dark"
              steps={createSteps}
              onSubmit={handleCreateSubmit}
              submitLabel="Create space"
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
      ) : spaces.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white px-6 py-8 text-center text-sm text-slate-500">
          No spaces yet. Create one to start organizing your boards.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {spaces.map((space) => (
            <SpaceCard key={space.id} space={space} />
          ))}
        </div>
      )}

      {error && !isCreateOpen && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
