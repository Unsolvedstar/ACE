import { CalendarDays, CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { PersonAvatar } from "./PersonAvatar";
import { formatDate } from "../../lib/format";
import { BoardTaskStatus, type BoardTaskDto } from "../../types/board";

function isOverdue(task: BoardTaskDto): boolean {
  if (!task.dueDate || task.status === BoardTaskStatus.Done) return false;
  return task.dueDate < new Date().toISOString().slice(0, 10);
}

interface TaskCardProps {
  task: BoardTaskDto;
  /** Any board member — matches the backend's ChangeStatusAsync/UpdateAsync rules. */
  canChangeStatus: boolean;
  /** Any board member — matches UpdateAsync. */
  canEdit: boolean;
  /** Owner only — matches DeleteAsync. */
  canDelete: boolean;
  /** Briefly true right after this task is moved to Done, to play a completion pulse. */
  isCelebrating?: boolean;
  onMoveStatus: (status: BoardTaskStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function TaskCard({
  task,
  canChangeStatus,
  canEdit,
  canDelete,
  isCelebrating,
  onMoveStatus,
  onEdit,
  onDelete,
}: TaskCardProps) {
  const overdue = isOverdue(task);
  const isDone = task.status === BoardTaskStatus.Done;

  return (
    <div
      className={`group flex items-start gap-2 rounded-lg border bg-slate-100 p-3 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg ${
        isDone ? "border-emerald-300 border-l-2 border-l-emerald-500" : "border-slate-100 hover:border-gold-500/40"
      } ${isCelebrating ? "task-complete-pulse" : ""}`}
    >
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${isDone ? "text-slate-500 line-through" : "text-slate-800"}`}>{task.title}</p>
        {task.description && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{task.description}</p>}

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {task.assigneeEmployeeName && (
            <span className="flex items-center gap-1 rounded-full bg-slate-50 py-0.5 pl-0.5 pr-2 text-[10px] font-medium text-slate-600">
              <PersonAvatar name={task.assigneeEmployeeName} size={16} />
              {task.assigneeEmployeeName.split(" ")[0]}
            </span>
          )}
          {task.dueDate && (
            <span
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                overdue ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-500"
              }`}
            >
              <CalendarDays className="h-2.5 w-2.5" />
              {formatDate(task.dueDate)}
            </span>
          )}
        </div>

        {isDone ? (
          <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Completed
          </div>
        ) : (
          canChangeStatus && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {task.status === BoardTaskStatus.Todo && (
                <button
                  type="button"
                  onClick={() => onMoveStatus(BoardTaskStatus.InProgress)}
                  className="rounded-full border border-amber-300 px-2 py-0.5 text-[10px] font-medium text-amber-600 transition-colors hover:bg-amber-50"
                >
                  In Progress
                </button>
              )}
              <button
                type="button"
                onClick={() => onMoveStatus(BoardTaskStatus.Done)}
                className="rounded-full border border-emerald-300 px-2 py-0.5 text-[10px] font-medium text-emerald-600 transition-colors hover:bg-emerald-50"
              >
                Completed
              </button>
            </div>
          )
        )}
      </div>

      {(canEdit || canDelete) && (
        <div className="flex shrink-0 flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {canEdit && (
            <button
              type="button"
              onClick={onEdit}
              aria-label="Edit task"
              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <Pencil className="h-3 w-3" />
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              aria-label="Delete task"
              className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
