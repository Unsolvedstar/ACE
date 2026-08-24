using AcmeHR.Application.Common;

namespace AcmeHR.Application.Agents;

public interface IAgentService
{
    Task<Result<AgentConversationDto>> GetOrCreateConversationAsync(
        Guid boardId, Guid employeeId, CancellationToken cancellationToken = default);

    Task<Result<IReadOnlyList<AgentMessageDto>>> GetMessagesAsync(
        Guid boardId, Guid employeeId, CancellationToken cancellationToken = default);

    Task<Result<AgentChatTurnResultDto>> SendMessageAsync(
        Guid boardId, Guid employeeId, SendAgentMessageRequest request, CancellationToken cancellationToken = default);

    Task<Result<AgentSummaryDto>> GetStandupSummaryAsync(
        Guid boardId, Guid employeeId, DateOnly? sinceDate, CancellationToken cancellationToken = default);
}
