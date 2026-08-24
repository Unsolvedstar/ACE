using AcmeHR.Domain.Enums;

namespace AcmeHR.Application.Agents;

public record AgentMessageDto(Guid Id, AgentMessageRole Role, string Content, DateTime CreatedAtUtc);

public record AgentConversationDto(Guid Id, Guid BoardId, DateTime CreatedAtUtc, DateTime LastMessageAtUtc);

public record SendAgentMessageRequest(string Content);

public record AgentChatTurnResultDto(AgentMessageDto UserMessage, AgentMessageDto AssistantMessage);

public record AgentSummaryDto(string Summary);
