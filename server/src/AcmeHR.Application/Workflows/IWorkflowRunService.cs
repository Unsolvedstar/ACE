using AcmeHR.Application.Common;

namespace AcmeHR.Application.Workflows;

public interface IWorkflowRunService
{
    Task<Result<WorkflowRunDto>> TriggerAsync(
        Guid workflowId, Guid requesterId, CancellationToken cancellationToken = default);

    Task<Result<IReadOnlyList<WorkflowRunDto>>> GetHistoryAsync(
        Guid workflowId, Guid requesterId, CancellationToken cancellationToken = default);

    Task<Result<WorkflowRunDto>> GetByIdAsync(
        Guid workflowId, Guid runId, Guid requesterId, CancellationToken cancellationToken = default);
}
