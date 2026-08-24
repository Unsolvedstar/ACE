import { apiClient } from "./client";
import type { Board, CreateBoardRequest } from "../types/boards";

export async function getMyBoards(): Promise<Board[]> {
  const { data } = await apiClient.get<Board[]>("/boards/mine");
  return data;
}

export async function getBoard(boardId: string): Promise<Board> {
  const { data } = await apiClient.get<Board>(`/boards/${boardId}`);
  return data;
}

export async function createBoard(request: CreateBoardRequest): Promise<Board> {
  const { data } = await apiClient.post<Board>("/boards", request);
  return data;
}

export async function addBoardMember(boardId: string, employeeId: string): Promise<Board> {
  const { data } = await apiClient.post<Board>(`/boards/${boardId}/members`, { employeeId });
  return data;
}
