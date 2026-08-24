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

export const AgentToolName = {
  CreateTask: 0,
  UpdateTaskStatus: 1,
  AssignTask: 2,
  SetDeadline: 3,
} as const;

export type AgentToolName = (typeof AgentToolName)[keyof typeof AgentToolName];

export const AgentToolNameLabels: Record<AgentToolName, string> = {
  [AgentToolName.CreateTask]: "Create task",
  [AgentToolName.UpdateTaskStatus]: "Update status",
  [AgentToolName.AssignTask]: "Reassign task",
  [AgentToolName.SetDeadline]: "Set deadline",
};

export const AgentActionStatus = {
  Proposed: 0,
  Executed: 1,
  Rejected: 2,
  Failed: 3,
} as const;

export type AgentActionStatus = (typeof AgentActionStatus)[keyof typeof AgentActionStatus];

export const AgentActionStatusLabels: Record<AgentActionStatus, string> = {
  [AgentActionStatus.Proposed]: "Pending approval",
  [AgentActionStatus.Executed]: "Executed",
  [AgentActionStatus.Rejected]: "Rejected",
  [AgentActionStatus.Failed]: "Failed",
};

export const AgentActionStatusColors: Record<AgentActionStatus, string> = {
  [AgentActionStatus.Proposed]: "#f5a83c",
  [AgentActionStatus.Executed]: "#1ecb8f",
  [AgentActionStatus.Rejected]: "#e69c9c",
  [AgentActionStatus.Failed]: "#e69c9c",
};

export interface AgentActionAuditDto {
  id: string;
  boardId: string;
  toolName: AgentToolName;
  summary: string;
  targetTaskId: string | null;
  status: AgentActionStatus;
  resultDetail: string | null;
  requestedByEmployeeId: string;
  requestedByEmployeeName: string;
  decidedByEmployeeId: string | null;
  decidedByEmployeeName: string | null;
  decidedAtUtc: string | null;
  createdAtUtc: string;
  executedAtUtc: string | null;
}

export interface RejectAgentActionRequest {
  reason?: string;
}

export interface AgentBoardSettingsDto {
  boardId: string;
  autoExecuteEnabled: boolean;
  updatedAtUtc: string;
}

export interface UpdateAgentBoardSettingsRequest {
  autoExecuteEnabled: boolean;
}

export interface AgentChatTurnResultDto {
  userMessage: AgentMessageDto;
  assistantMessage: AgentMessageDto;
  proposedActions: AgentActionAuditDto[];
}

export interface AgentSummaryDto {
  summary: string;
}

export interface SuggestTaskFieldsRequest {
  titleDraft: string;
  descriptionDraft?: string;
}

export interface AgentTaskSuggestionDto {
  suggestedAssigneeEmployeeId: string | null;
  suggestedAssigneeName: string | null;
  suggestedAssigneeReason: string | null;
  suggestedDueDate: string | null;
  suggestedDueDateReason: string | null;
  suggestedPriorityLabel: string | null;
  suggestedPriorityReason: string | null;
}
