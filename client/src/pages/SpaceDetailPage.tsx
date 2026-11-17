import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Folder as FolderIcon, Plus } from "lucide-react";
import { getSpaceById } from "../api/spaces";
import { createFolder, getFoldersForSpace } from "../api/folders";
import { createBoard, getMyBoards, moveBoard } from "../api/boards";
import { extractErrorMessage } from "../api/client";
import { MoveBoardMenu } from "../components/workspace/MoveBoardMenu";
import { BoardCard } from "../components/boards/BoardCard";
import { BoardPriority } from "../types/board";
import type { BoardDto } from "../types/board";
import type { FolderDto } from "../types/folder";
import type { SpaceDto } from "../types/space";

const inputClasses =
  "rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/15";

export function SpaceDetailPage() {
  const { spaceId } = useParams<{ spaceId: string }>();

  const [space, setSpace] = useState<SpaceDto | null>(null);
  const [folders, setFolders] = useState<FolderDto[]>([]);
  const [boards, setBoards] = useState<BoardDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const [isNewBoardOpen, setIsNewBoardOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardFolderId, setNewBoardFolderId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!spaceId) return;
    try {
      const [spaceResult, folderResults, boardResults] = await Promise.all([
        getSpaceById(spaceId),
        getFoldersForSpace(spaceId),
        getMyBoards(),
      ]);
      setSpace(spaceResult);
      setFolders(folderResults);
      setBoards(boardResults.filter((b) => b.spaceId === spaceId));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [spaceId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreateFolder() {
    if (!spaceId || !newFolderName.trim()) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await createFolder(spaceId, { spaceId, name: newFolderName });
      setNewFolderName("");
      setIsNewFolderOpen(false);
      await load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateBoard() {
    if (!spaceId || !newBoardName.trim()) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await createBoard({
        name: newBoardName,
        spaceId,
        folderId: newBoardFolderId || undefined,
        priority: BoardPriority.Normal,
        initialMemberEmployeeIds: [],
      });
      setNewBoardName("");
      setNewBoardFolderId("");
      setIsNewBoardOpen(false);
      await load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleMoveBoard(boardId: string, folderId: string | null) {
    if (!spaceId) return;
    try {
      await moveBoard(boardId, { spaceId, folderId: folderId ?? undefined });
      await load();
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading space...</p>;
  }

  if (!space) {
    return <p className="text-sm text-red-600">{error ?? "Space not found."}</p>;
  }

  const unsortedBoards = boards.filter((b) => b.folderId === null);
  const boardsByFolder = (folderId: string) => boards.filter((b) => b.folderId === folderId);

  return (
    <div className="stagger-children flex flex-col gap-6">
      <div>
        <Link to="/workspace" className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-3.5 w-3.5" />
          Workspace
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{space.name}</h2>
            {space.description && <p className="text-xs text-slate-500">{space.description}</p>}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsNewFolderOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              <FolderIcon className="h-3.5 w-3.5" />
              New folder
            </button>
            <button
              type="button"
              onClick={() => setIsNewBoardOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-gold-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gold-500"
            >
              <Plus className="h-4 w-4" />
              New board
            </button>
          </div>
        </div>
      </div>

      {isNewFolderOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink-950/60 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">New folder</h3>
            <input
              autoFocus
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className={`${inputClasses} w-full`}
            />
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={handleCreateFolder}
                disabled={isSubmitting || !newFolderName.trim()}
                className="rounded-md bg-gold-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {isSubmitting ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsNewFolderOpen(false);
                  setNewFolderName("");
                  setError(null);
                }}
                className="text-xs text-slate-500 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {isNewBoardOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink-950/60 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="mb-3 text-sm font-semibold text-slate-900">New board</h3>
            <div className="flex flex-col gap-3">
              <input
                autoFocus
                placeholder="Board name"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                className={inputClasses}
              />
              <select
                value={newBoardFolderId}
                onChange={(e) => setNewBoardFolderId(e.target.value)}
                className={inputClasses}
              >
                <option value="">Directly in space</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>
            {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={handleCreateBoard}
                disabled={isSubmitting || !newBoardName.trim()}
                className="rounded-md bg-gold-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {isSubmitting ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsNewBoardOpen(false);
                  setNewBoardName("");
                  setNewBoardFolderId("");
                  setError(null);
                }}
                className="text-xs text-slate-500 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {folders.map((folder) => {
        const folderBoards = boardsByFolder(folder.id);
        return (
          <div key={folder.id} className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <FolderIcon className="h-4 w-4 text-slate-400" />
              {folder.name}
            </div>
            {folderBoards.length === 0 ? (
              <p className="text-xs text-slate-400">No boards in this folder yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {folderBoards.map((board) => (
                  <div key={board.id} className="relative">
                    <BoardCard board={board} />
                    <div className="absolute right-3 top-3">
                      <MoveBoardMenu
                        folders={folders}
                        currentFolderId={board.folderId}
                        onMove={(folderId) => handleMoveBoard(board.id, folderId)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div className="flex flex-col gap-3">
        <div className="text-sm font-semibold text-slate-700">Unsorted</div>
        {unsortedBoards.length === 0 ? (
          <p className="text-xs text-slate-400">No boards directly in this space.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {unsortedBoards.map((board) => (
              <div key={board.id} className="relative">
                <BoardCard board={board} />
                <div className="absolute right-3 top-3">
                  <MoveBoardMenu
                    folders={folders}
                    currentFolderId={board.folderId}
                    onMove={(folderId) => handleMoveBoard(board.id, folderId)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && !isNewFolderOpen && !isNewBoardOpen && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
