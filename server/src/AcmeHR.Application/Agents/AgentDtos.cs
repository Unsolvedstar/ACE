using AcmeHR.Domain.Enums;

namespace AcmeHR.Application.Agents;

public record AgentMessageDto(Guid Id, AgentMessageRole Role, string Content, DateTime CreatedAtUtc);

public record AgentConversationDto(Guid Id, Guid BoardId, DateTime CreatedAtUtc, DateTime LastMessageAtUtc);

public record SendAgentMessageRequest(string Content);

public record AgentChatTurnResultDto(
    AgentMessageDto UserMessage,
    AgentMessageDto AssistantMessage,
    IReadOnlyList<AgentActionAuditDto> ProposedActions);

public record AgentSummaryDto(string Summary);

public record AgentActionAuditDto(
    Guid Id,
    Guid BoardId,
    AgentToolName ToolName,
    string Summary,
    Guid? TargetTaskId,
    AgentActionStatus Status,
    string? ResultDetail,
    Guid RequestedByEmployeeId,
    string RequestedByEmployeeName,
    Guid? DecidedByEmployeeId,
    string? DecidedByEmployeeName,
    DateTime? DecidedAtUtc,
    DateTime CreatedAtUtc,
    DateTime? ExecutedAtUtc);

public record RejectAgentActionRequest(string? Reason);

public record AgentBoardSettingsDto(Guid BoardId, bool AutoExecuteEnabled, DateTime UpdatedAtUtc);

public record UpdateAgentBoardSettingsRequest(bool AutoExecuteEnabled);

public record SuggestTaskFieldsRequest(string TitleDraft, string? DescriptionDraft);

public record AgentTaskSuggestionDto(
    Guid? SuggestedAssigneeEmployeeId,
    string? SuggestedAssigneeName,
    string? SuggestedAssigneeReason,
    DateOnly? SuggestedDueDate,
    string? SuggestedDueDateReason,
    string? SuggestedPriorityLabel,
    string? SuggestedPriorityReason);
