import { useState } from "react";
import { FolderInput } from "lucide-react";
import type { FolderDto } from "../../types/folder";

interface MoveBoardMenuProps {
  folders: FolderDto[];
  currentFolderId: string | null;
  onMove: (folderId: string | null) => void | Promise<void>;
}

/** Small inline dropdown for reparenting a board between "directly in the space" and its folders. */
export function MoveBoardMenu({ folders, currentFolderId, onMove }: MoveBoardMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          setIsOpen((v) => !v);
        }}
        title="Move board"
        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      >
        <FolderInput className="h-3.5 w-3.5" />
      </button>
      {isOpen && (
        <div
          className="absolute right-0 top-8 z-10 w-48 rounded-lg border border-slate-200 bg-slate-50 py-1 text-xs shadow-xl"
          onClick={(e) => e.preventDefault()}
        >
          <button
            type="button"
            onClick={async () => {
              setIsOpen(false);
              await onMove(null);
            }}
            disabled={currentFolderId === null}
            className="block w-full px-3 py-1.5 text-left text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
          >
            Directly in space
          </button>
          {folders.map((folder) => (
            <button
              key={folder.id}
              type="button"
              onClick={async () => {
                setIsOpen(false);
                await onMove(folder.id);
              }}
              disabled={currentFolderId === folder.id}
              className="block w-full truncate px-3 py-1.5 text-left text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40"
            >
              {folder.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
