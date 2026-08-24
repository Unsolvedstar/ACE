using AcmeHR.Application.Common;
using AcmeHR.Domain.Enums;

namespace AcmeHR.Application.Agents;

public interface IAgentActionService
{
    Task<Result<IReadOnlyList<AgentActionAuditDto>>> GetForBoardAsync(
        Guid boardId, Guid requesterId, AgentActionStatus? status, CancellationToken cancellationToken = default);

    Task<Result<AgentActionAuditDto>> ApproveAsync(
        Guid boardId, Guid actionId, Guid approverId, CancellationToken cancellationToken = default);

    Task<Result<AgentActionAuditDto>> RejectAsync(
        Guid boardId, Guid actionId, Guid approverId, RejectAgentActionRequest request, CancellationToken cancellationToken = default);
}
