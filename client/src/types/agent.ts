export const AgentMessageRole = {
  User: 0,
  Assistant: 1,
} as const;

export type AgentMessageRole = (typeof AgentMessageRole)[keyof typeof AgentMessageRole];

export interface AgentMessageDto {
  id: string;
  role: AgentMessageRole;
  content: string;
  createdAtUtc: string;
}

export interface AgentConversationDto {
  id: string;
  boardId: string;
  createdAtUtc: string;
  lastMessageAtUtc: string;
}

export interface SendAgentMessageRequest {
  content: string;
}

export interface AgentChatTurnResultDto {
  userMessage: AgentMessageDto;
  assistantMessage: AgentMessageDto;
}

export interface AgentSummaryDto {
  summary: string;
}
