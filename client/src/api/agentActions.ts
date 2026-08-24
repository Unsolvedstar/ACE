import { apiClient } from "./client";
import type { AgentActionAuditDto, AgentActionStatus, RejectAgentActionRequest } from "../types/agent";

export async function getAgentActions(boardId: string, status?: AgentActionStatus): Promise<AgentActionAuditDto[]> {
  const { data } = await apiClient.get<AgentActionAuditDto[]>(`/boards/${boardId}/agent/actions`, {
    params: status !== undefined ? { status } : undefined,
  });
  return data;
}

export async function approveAgentAction(boardId: string, actionId: string): Promise<AgentActionAuditDto> {
  const { data } = await apiClient.post<AgentActionAuditDto>(`/boards/${boardId}/agent/actions/${actionId}/approve`);
  return data;
}

export async function rejectAgentAction(
  boardId: string,
  actionId: string,
  request: RejectAgentActionRequest,
): Promise<AgentActionAuditDto> {
  const { data } = await apiClient.post<AgentActionAuditDto>(`/boards/${boardId}/agent/actions/${actionId}/reject`, request);
  return data;
}
