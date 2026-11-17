import { Link } from "react-router-dom";
import { FolderTree, LayoutGrid, Users } from "lucide-react";
import type { SpaceDto } from "../../types/space";

interface SpaceCardProps {
  space: SpaceDto;
}

export function SpaceCard({ space }: SpaceCardProps) {
  return (
    <Link
      to={`/workspace/${space.id}`}
      className="flex flex-col gap-3 rounded-xl border-l-4 border-l-gold-600 bg-white p-4 shadow-lg transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{space.name}</p>
          <p className="truncate text-xs text-slate-500">Owned by {space.ownerEmployeeName}</p>
        </div>
        {space.isArchived && (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
            Archived
          </span>
        )}
      </div>

      {space.description && <p className="line-clamp-2 text-xs text-slate-600">{space.description}</p>}

      <div className="mt-auto flex items-center gap-4 pt-1 text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <FolderTree className="h-3.5 w-3.5" />
          {space.folderCount} folder{space.folderCount === 1 ? "" : "s"}
        </span>
        <span className="flex items-center gap-1">
          <LayoutGrid className="h-3.5 w-3.5" />
          {space.boardCount} board{space.boardCount === 1 ? "" : "s"}
        </span>
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {space.members.length}
        </span>
      </div>
    </Link>
  );
}
