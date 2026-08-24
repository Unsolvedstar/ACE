import { apiClient } from "./client";
import type { BoardTask, BoardTaskStatus, CreateBoardTaskRequest, WeeklyTaskCompletion } from "../types/boards";

export async function getBoardTasks(boardId: string): Promise<BoardTask[]> {
  const { data } = await apiClient.get<BoardTask[]>(`/boards/${boardId}/tasks`);
  return data;
}

export async function getBoardTask(boardId: string, taskId: string): Promise<BoardTask> {
  const { data } = await apiClient.get<BoardTask>(`/boards/${boardId}/tasks/${taskId}`);
  return data;
}

export async function createBoardTask(boardId: string, request: CreateBoardTaskRequest): Promise<BoardTask> {
  const { data } = await apiClient.post<BoardTask>(`/boards/${boardId}/tasks`, request);
  return data;
}

export async function changeTaskStatus(boardId: string, taskId: string, status: BoardTaskStatus): Promise<BoardTask> {
  const { data } = await apiClient.post<BoardTask>(`/boards/${boardId}/tasks/${taskId}/status`, { status });
  return data;
}

export async function getWeeklySummary(boardId: string, weekStartUtc?: string): Promise<WeeklyTaskCompletion[]> {
  const { data } = await apiClient.get<WeeklyTaskCompletion[]>(`/boards/${boardId}/tasks/weekly-summary`, {
    params: weekStartUtc ? { weekStartUtc } : undefined,
  });
  return data;
}

export async function getWeeklySummaryPdf(boardId: string, weekStartUtc?: string): Promise<ArrayBuffer> {
  const { data } = await apiClient.get<ArrayBuffer>(`/boards/${boardId}/tasks/weekly-summary/pdf`, {
    params: weekStartUtc ? { weekStartUtc } : undefined,
    responseType: 'arraybuffer',
  });
  return data;
}
