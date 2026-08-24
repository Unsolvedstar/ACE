import { apiClient } from "./client";
import type { AgentBoardSettingsDto, UpdateAgentBoardSettingsRequest } from "../types/agent";

export async function getAgentSettings(boardId: string): Promise<AgentBoardSettingsDto> {
  const { data } = await apiClient.get<AgentBoardSettingsDto>(`/boards/${boardId}/agent/settings`);
  return data;
}

export async function updateAgentSettings(
  boardId: string,
  request: UpdateAgentBoardSettingsRequest,
): Promise<AgentBoardSettingsDto> {
  const { data } = await apiClient.put<AgentBoardSettingsDto>(`/boards/${boardId}/agent/settings`, request);
  return data;
}
