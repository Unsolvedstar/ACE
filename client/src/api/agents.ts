import { apiClient } from "./client";
import type {
  AgentChatTurnResultDto,
  AgentConversationDto,
  AgentMessageDto,
  AgentSummaryDto,
  AgentTaskSuggestionDto,
  SendAgentMessageRequest,
  SuggestTaskFieldsRequest,
} from "../types/agent";

export async function getOrCreateConversation(boardId: string): Promise<AgentConversationDto> {
  const { data } = await apiClient.get<AgentConversationDto>(`/boards/${boardId}/agent/conversation`);
  return data;
}

export async function getAgentMessages(boardId: string): Promise<AgentMessageDto[]> {
  const { data } = await apiClient.get<AgentMessageDto[]>(`/boards/${boardId}/agent/messages`);
  return data;
}

export async function sendAgentMessage(
  boardId: string,
  request: SendAgentMessageRequest,
): Promise<AgentChatTurnResultDto> {
  const { data } = await apiClient.post<AgentChatTurnResultDto>(`/boards/${boardId}/agent/messages`, request);
  return data;
}

export async function getAgentSummary(boardId: string, sinceDate?: string): Promise<AgentSummaryDto> {
  const { data } = await apiClient.get<AgentSummaryDto>(`/boards/${boardId}/agent/summary`, {
    params: sinceDate ? { sinceDate } : undefined,
  });
  return data;
}

export async function suggestTaskFields(
  boardId: string,
  request: SuggestTaskFieldsRequest,
): Promise<AgentTaskSuggestionDto> {
  const { data } = await apiClient.post<AgentTaskSuggestionDto>(`/boards/${boardId}/agent/suggest-task`, request);
  return data;
}
