using AcmeHR.Application.Common;

namespace AcmeHR.Application.Agents;

public interface IAgentSettingsService
{
    Task<Result<AgentBoardSettingsDto>> GetAsync(
        Guid boardId, Guid requesterId, CancellationToken cancellationToken = default);

    Task<Result<AgentBoardSettingsDto>> UpdateAsync(
        Guid boardId, Guid requesterId, UpdateAgentBoardSettingsRequest request, CancellationToken cancellationToken = default);
}
