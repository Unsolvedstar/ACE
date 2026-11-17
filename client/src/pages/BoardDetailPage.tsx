import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FileDown, Plus, Settings2, Sparkles, UserPlus } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { addBoardMember, getBoardById, updateBoard } from "../api/boards";
import { getAgentSettings, updateAgentSettings } from "../api/agentSettings";
import { changeBoardTaskStatus, createBoardTask, deleteBoardTask, downloadWeeklySummaryPdf, getTasksForBoard, updateBoardTask } from "../api/boardTasks";
import { extractErrorMessage } from "../api/client";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { AgentChatPanel } from "../components/boards/AgentChatPanel";
import { BoardMemberPicker } from "../components/boards/BoardMemberPicker";
import { PersonAvatar } from "../components/boards/PersonAvatar";
import { TaskCard } from "../components/boards/TaskCard";
import { TaskFormDialog, type TaskFormValues } from "../components/boards/TaskFormDialog";
import { useBoardHub } from "../lib/useBoardHub";
import { EmployeeRole } from "../types/auth";
import {
  BoardPriority,
  BoardPriorityLabels,
  BoardStatus,
  BoardStatusLabels,
  BoardTaskStatus,
  BoardTaskStatusLabels,
  type BoardDto,
  type BoardTaskDto,
} from "../types/board";

const AGENT_ACTION_APPROVER_ROLES: EmployeeRole[] = [EmployeeRole.LineManager, EmployeeRole.HR, EmployeeRole.Executive];

const COLUMNS: { status: BoardTaskStatus; color: string }[] = [
  { status: BoardTaskStatus.Todo, color: "#8e9195" },
  { status: BoardTaskStatus.InProgress, color: "#f5a83c" },
  { status: BoardTaskStatus.Done, color: "#1ecb8f" },
];

export function BoardDetailPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const { session } = useAuth();

  const [board, setBoard] = useState<BoardDto | null>(null);
  const [tasks, setTasks] = useState<BoardTaskDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [taskDialog, setTaskDialog] = useState<{ task?: BoardTaskDto } | null>(null);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [taskFormError, setTaskFormError] = useState<string | null>(null);
  const [taskPendingDelete, setTaskPendingDelete] = useState<BoardTaskDto | null>(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);

  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [newMemberIds, setNewMemberIds] = useState<string[]>([]);
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [addMemberError, setAddMemberError] = useState<string | null>(null);

  const [celebratingTaskId, setCelebratingTaskId] = useState<string | null>(null);
  const [isAgentPanelOpen, setIsAgentPanelOpen] = useState(false);
  const [agentActivityVersion, setAgentActivityVersion] = useState(0);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsPriority, setSettingsPriority] = useState<BoardPriority>(BoardPriority.Normal);
  const [settingsStatus, setSettingsStatus] = useState<BoardStatus>(BoardStatus.NotStarted);
  const [settingsDeadline, setSettingsDeadline] = useState("");
  const [settingsAutoExecute, setSettingsAutoExecute] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    if (!boardId) return;
    try {
      setTasks(await getTasksForBoard(boardId));
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }, [boardId]);

  useEffect(() => {
    if (!boardId) return;
    setIsLoading(true);
    Promise.all([getBoardById(boardId).then(setBoard), loadTasks()])
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setIsLoading(false));
  }, [boardId, loadTasks]);

  useBoardHub(boardId, loadTasks, () => setAgentActivityVersion((v) => v + 1));

  const isOwner = !!board && !!session && board.ownerEmployeeId === session.employeeId;
  // The owner is always included in board.members too, so this covers both.
  const isMember = !!board && !!session && board.members.some((m) => m.employeeId === session.employeeId);
  const canDecideAgentActions =
    isOwner || (isMember && !!session && AGENT_ACTION_APPROVER_ROLES.includes(session.role));

  const tasksByColumn = useMemo(() => {
    const grouped = new Map<BoardTaskStatus, BoardTaskDto[]>();
    for (const column of COLUMNS) grouped.set(column.status, []);
    for (const task of tasks) grouped.get(task.status)?.push(task);
    return grouped;
  }, [tasks]);

  function handleMoveStatus(task: BoardTaskDto, targetStatus: BoardTaskStatus) {
    if (task.status === targetStatus || !boardId) return;

    changeBoardTaskStatus(boardId, task.id, { status: targetStatus })
      .then((updated) => {
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        if (targetStatus === BoardTaskStatus.Done) {
          setCelebratingTaskId(updated.id);
          setTimeout(() => setCelebratingTaskId(null), 700);
        }
      })
      .catch((err) => setError(extractErrorMessage(err)));
  }

  async function handleTaskFormSubmit(values: TaskFormValues) {
    if (!boardId) return;
    setIsSubmittingTask(true);
    setTaskFormError(null);
    try {
      const request = {
        title: values.title,
        description: values.description || undefined,
        assigneeEmployeeId: values.assigneeEmployeeId || undefined,
        dueDate: values.dueDate || undefined,
      };
      const updated = taskDialog?.task
        ? await updateBoardTask(boardId, taskDialog.task.id, request)
        : await createBoardTask(boardId, request);
      setTasks((prev) => {
        const exists = prev.some((t) => t.id === updated.id);
        return exists ? prev.map((t) => (t.id === updated.id ? updated : t)) : [...prev, updated];
      });
      setTaskDialog(null);
    } catch (err) {
      setTaskFormError(extractErrorMessage(err));
    } finally {
      setIsSubmittingTask(false);
    }
  }

  async function handleConfirmDelete() {
    if (!boardId || !taskPendingDelete) return;
    setIsDeletingTask(true);
    try {
      await deleteBoardTask(boardId, taskPendingDelete.id);
      setTasks((prev) => prev.filter((t) => t.id !== taskPendingDelete.id));
      setTaskPendingDelete(null);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsDeletingTask(false);
    }
  }

  async function handleAddMembers() {
    if (!boardId || newMemberIds.length === 0) return;
    setIsAddingMembers(true);
    setAddMemberError(null);
    try {
      let latestBoard = board;
      for (const employeeId of newMemberIds) {
        latestBoard = await addBoardMember(boardId, { employeeId });
      }
      setBoard(latestBoard);
      setNewMemberIds([]);
      setIsAddMemberOpen(false);
    } catch (err) {
      setAddMemberError(extractErrorMessage(err));
    } finally {
      setIsAddingMembers(false);
    }
  }

  function openSettings() {
    if (!board || !boardId) return;
    setSettingsPriority(board.priority);
    setSettingsStatus(board.status);
    setSettingsDeadline(board.deadline ?? "");
    setSettingsError(null);
    setIsSettingsOpen(true);
    getAgentSettings(boardId)
      .then((s) => setSettingsAutoExecute(s.autoExecuteEnabled))
      .catch((err) => setSettingsError(extractErrorMessage(err)));
  }

  async function handleSaveSettings() {
    if (!boardId || !board) return;
    setIsSavingSettings(true);
    setSettingsError(null);
    try {
      const updated = await updateBoard(boardId, {
        name: board.name,
        description: board.description || undefined,
        isArchived: board.isArchived,
        priority: settingsPriority,
        status: settingsStatus,
        deadline: settingsDeadline || undefined,
      });
      await updateAgentSettings(boardId, { autoExecuteEnabled: settingsAutoExecute });
      setBoard(updated);
      setIsSettingsOpen(false);
    } catch (err) {
      setSettingsError(extractErrorMessage(err));
    } finally {
      setIsSavingSettings(false);
    }
  }

  async function handleDownloadSummary() {
    if (!boardId || !board) return;
    try {
      await downloadWeeklySummaryPdf(boardId, board.name);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <p className="text-sm text-slate-500">Loading board...</p>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-red-600">{error ?? "Board not found."}</p>
        <Link to="/kpi/boards" className="text-sm text-gold-700 hover:underline">
          Back to boards
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Link to="/kpi/boards" className="flex w-fit items-center gap-1.5 text-xs text-slate-500 hover:text-slate-600">
        <ArrowLeft className="h-3.5 w-3.5" />
        Boards
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{board.name}</h2>
          {board.description && <p className="mt-1 max-w-xl text-sm text-slate-500">{board.description}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
              {BoardStatusLabels[board.status]}
            </span>
            {board.priority !== BoardPriority.Normal && (
              <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                {BoardPriorityLabels[board.priority]}
              </span>
            )}
            {board.deadline && (
              <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                Due {board.deadline}
              </span>
            )}
            <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
              {board.completionPercentage}% complete
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex -space-x-2">
            {board.members.map((member) => (
              <PersonAvatar key={member.employeeId} name={member.employeeName} size={28} className="border-slate-50" />
            ))}
          </div>
          {isMember && (
            <button
              type="button"
              onClick={() => setIsAgentPanelOpen(true)}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-gold-500/40 px-3 py-1.5 text-xs font-medium text-gold-700 transition-colors hover:bg-gold-500/10"
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI Assistant
            </button>
          )}
          {isOwner && (
            <button
              type="button"
              onClick={openSettings}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Board settings
            </button>
          )}
          {isOwner && (
            <button
              type="button"
              onClick={() => setIsAddMemberOpen(true)}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add member
            </button>
          )}
          {isOwner && (
            <button
              type="button"
              onClick={handleDownloadSummary}
              className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-gold-500/40 px-3 py-1.5 text-xs font-medium text-gold-700 transition-colors hover:bg-gold-500/10"
            >
              <FileDown className="h-3.5 w-3.5" />
              Weekly summary
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 overflow-x-auto pb-2">
        {COLUMNS.map((column) => {
          const columnTasks = tasksByColumn.get(column.status) ?? [];
          return (
            <div
              key={column.status}
              style={{ borderColor: `${column.color}4d` }}
              className="flex h-fit min-h-[200px] w-[300px] shrink-0 flex-col gap-2 rounded-xl border-2 bg-white p-3 backdrop-blur-md transition-all"
            >
              <div
                className="flex items-center justify-between gap-2 border-b pb-2"
                style={{ borderColor: `${column.color}4d` }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold" style={{ color: column.color }}>
                    {BoardTaskStatusLabels[column.status]}
                  </span>
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-slate-900"
                    style={{ backgroundColor: column.color }}
                  >
                    {columnTasks.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setTaskDialog({})}
                  aria-label="Add task"
                  className="rounded-md p-1 transition-colors hover:bg-slate-100"
                  style={{ color: column.color }}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {columnTasks.length === 0 ? (
                  <p className="px-1 py-3 text-center text-xs text-slate-400">No tasks</p>
                ) : (
                  columnTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      canChangeStatus={isMember}
                      canEdit={isMember}
                      canDelete={isOwner}
                      isCelebrating={task.id === celebratingTaskId}
                      onMoveStatus={(status) => handleMoveStatus(task, status)}
                      onEdit={() => setTaskDialog({ task })}
                      onDelete={() => setTaskPendingDelete(task)}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {taskDialog && boardId && (
        <TaskFormDialog
          boardId={boardId}
          members={board.members}
          task={taskDialog.task}
          isSubmitting={isSubmittingTask}
          error={taskFormError}
          onSubmit={handleTaskFormSubmit}
          onClose={() => {
            setTaskDialog(null);
            setTaskFormError(null);
          }}
        />
      )}

      {isAgentPanelOpen && boardId && (
        <AgentChatPanel
          boardId={boardId}
          canDecideActions={canDecideAgentActions}
          refreshSignal={agentActivityVersion}
          onClose={() => setIsAgentPanelOpen(false)}
        />
      )}

      {taskPendingDelete && (
        <ConfirmDialog
          title="Delete task"
          message={`Delete "${taskPendingDelete.title}"? This can't be undone.`}
          confirmLabel="Delete"
          isBusy={isDeletingTask}
          onConfirm={handleConfirmDelete}
          onCancel={() => setTaskPendingDelete(null)}
        />
      )}

      {isSettingsOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink-950/60 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl font-['Inter']">
            <h3 className="mb-4 text-sm font-semibold text-slate-900">Board settings</h3>
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm text-slate-600">
                Status
                <select
                  value={settingsStatus}
                  onChange={(e) => setSettingsStatus(Number(e.target.value) as BoardStatus)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-gold-500 focus:outline-none"
                >
                  {Object.entries(BoardStatusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-600">
                Priority
                <select
                  value={settingsPriority}
                  onChange={(e) => setSettingsPriority(Number(e.target.value) as BoardPriority)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-gold-500 focus:outline-none"
                >
                  {Object.entries(BoardPriorityLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-600">
                Deadline
                <input
                  type="date"
                  value={settingsDeadline}
                  onChange={(e) => setSettingsDeadline(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-gold-500 focus:outline-none"
                />
              </label>
              <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={settingsAutoExecute}
                  onChange={(e) => setSettingsAutoExecute(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-gold-600"
                />
                <span>
                  <span className="font-medium text-slate-900">Let the AI assistant act automatically</span>
                  <br />
                  <span className="text-xs text-slate-500">
                    {settingsAutoExecute
                      ? "The assistant executes task actions immediately."
                      : "The assistant proposes actions for a manager to approve first (default)."}
                  </span>
                </span>
              </label>
            </div>
            {settingsError && <p className="mt-2 text-sm text-red-600">{settingsError}</p>}
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                disabled={isSavingSettings}
                onClick={handleSaveSettings}
                className="rounded-lg bg-gold-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gold-500 disabled:opacity-50"
              >
                {isSavingSettings ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="text-xs text-slate-500 hover:text-slate-600 hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddMemberOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink-950/60 px-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl font-['Inter']">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Add members</h3>
            <BoardMemberPicker
              selectedIds={newMemberIds}
              onChange={setNewMemberIds}
              excludeEmployeeIds={board.members.map((m) => m.employeeId)}
            />
            {addMemberError && <p className="mt-2 text-sm text-red-600">{addMemberError}</p>}
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                disabled={isAddingMembers || newMemberIds.length === 0}
                onClick={handleAddMembers}
                className="rounded-lg bg-gold-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gold-500 disabled:opacity-50"
              >
                {isAddingMembers ? "Adding..." : "Add selected"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAddMemberOpen(false);
                  setNewMemberIds([]);
                  setAddMemberError(null);
                }}
                className="text-xs text-slate-500 hover:text-slate-600 hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
