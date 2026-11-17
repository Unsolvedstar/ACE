import { apiClient } from "./client";
import type { CreateFolderRequest, FolderDto, UpdateFolderRequest } from "../types/folder";

export async function getFoldersForSpace(spaceId: string): Promise<FolderDto[]> {
  const { data } = await apiClient.get<FolderDto[]>(`/spaces/${spaceId}/folders`);
  return data;
}

export async function createFolder(spaceId: string, request: CreateFolderRequest): Promise<FolderDto> {
  const { data } = await apiClient.post<FolderDto>(`/spaces/${spaceId}/folders`, request);
  return data;
}

export async function updateFolder(spaceId: string, folderId: string, request: UpdateFolderRequest): Promise<FolderDto> {
  const { data } = await apiClient.patch<FolderDto>(`/spaces/${spaceId}/folders/${folderId}`, request);
  return data;
}

export async function deleteFolder(spaceId: string, folderId: string): Promise<void> {
  await apiClient.delete(`/spaces/${spaceId}/folders/${folderId}`);
}
