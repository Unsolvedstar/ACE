import { Link } from "react-router-dom";
import { CalendarDays, Users } from "lucide-react";
import { PersonAvatar } from "./PersonAvatar";
import { formatDate } from "../../lib/format";
import {
  BoardPriority,
  BoardPriorityColors,
  BoardPriorityLabels,
  BoardStatus,
  BoardStatusLabels,
  type BoardDto,
} from "../../types/board";

const MAX_VISIBLE_MEMBERS = 5;

const STATUS_COLORS: Record<BoardStatus, string> = {
  [BoardStatus.NotStarted]: "#8e9195",
  [BoardStatus.InProgress]: "#f5a83c",
  [BoardStatus.OnHold]: "#c65a5a",
  [BoardStatus.Completed]: "#1ecb8f",
};

interface BoardCardProps {
  board: BoardDto;
}

export function BoardCard({ board }: BoardCardProps) {
  const visibleMembers = board.members.slice(0, MAX_VISIBLE_MEMBERS);
  const overflowCount = board.members.length - visibleMembers.length;
  const statusColor = STATUS_COLORS[board.status];

  return (
    <Link
      to={`/kpi/boards/${board.id}`}
      className="flex flex-col gap-3 rounded-xl border-l-4 border-l-gold-600 bg-white p-4 shadow-lg transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{board.name}</p>
          <p className="truncate text-xs text-slate-500">Owned by {board.ownerEmployeeName}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {board.isArchived && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
              Archived
            </span>
          )}
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ backgroundColor: `${statusColor}26`, color: statusColor }}
          >
            {BoardStatusLabels[board.status]}
          </span>
        </div>
      </div>

      {board.description && <p className="line-clamp-2 text-xs text-slate-600">{board.description}</p>}

      <div className="flex flex-wrap items-center gap-1.5">
        {board.priority !== BoardPriority.Normal && (
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ backgroundColor: `${BoardPriorityColors[board.priority]}26`, color: BoardPriorityColors[board.priority] }}
          >
            {BoardPriorityLabels[board.priority]}
          </span>
        )}
        {board.deadline && (
          <span className="flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500">
            <CalendarDays className="h-2.5 w-2.5" />
            {formatDate(board.deadline)}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-gold-600 transition-all" style={{ width: `${board.completionPercentage}%` }} />
        </div>
        <span className="text-[10px] font-semibold text-slate-500">{board.completionPercentage}%</span>
      </div>

      <div className="mt-auto flex items-center gap-2 pt-1">
        <Users className="h-3.5 w-3.5 text-slate-500" />
        <div className="flex -space-x-2">
          {visibleMembers.map((member) => (
            <PersonAvatar key={member.employeeId} name={member.employeeName} size={24} className="border-white" />
          ))}
          {overflowCount > 0 && (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[10px] font-semibold text-slate-600">
              +{overflowCount}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
