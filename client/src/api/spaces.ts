import { apiClient } from "./client";
import type { AddSpaceMemberRequest, CreateSpaceRequest, SpaceDto, UpdateSpaceRequest } from "../types/space";

export async function getMySpaces(): Promise<SpaceDto[]> {
  const { data } = await apiClient.get<SpaceDto[]>("/spaces/mine");
  return data;
}

export async function createSpace(request: CreateSpaceRequest): Promise<SpaceDto> {
  const { data } = await apiClient.post<SpaceDto>("/spaces", request);
  return data;
}

export async function getSpaceById(id: string): Promise<SpaceDto> {
  const { data } = await apiClient.get<SpaceDto>(`/spaces/${id}`);
  return data;
}

export async function updateSpace(id: string, request: UpdateSpaceRequest): Promise<SpaceDto> {
  const { data } = await apiClient.patch<SpaceDto>(`/spaces/${id}`, request);
  return data;
}

export async function addSpaceMember(id: string, request: AddSpaceMemberRequest): Promise<SpaceDto> {
  const { data } = await apiClient.post<SpaceDto>(`/spaces/${id}/members`, request);
  return data;
}

export async function removeSpaceMember(id: string, employeeId: string): Promise<SpaceDto> {
  const { data } = await apiClient.delete<SpaceDto>(`/spaces/${id}/members/${employeeId}`);
  return data;
}
