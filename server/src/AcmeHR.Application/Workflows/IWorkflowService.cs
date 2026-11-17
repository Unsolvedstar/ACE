using AcmeHR.Application.Common;

namespace AcmeHR.Application.Workflows;

public interface IWorkflowService
{
    Task<Result<WorkflowDto>> CreateAsync(
        Guid ownerEmployeeId, CreateWorkflowRequest request, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<WorkflowSummaryDto>> GetMineAsync(
        Guid employeeId, CancellationToken cancellationToken = default);

    Task<Result<WorkflowDto>> GetByIdAsync(
        Guid workflowId, Guid requesterId, CancellationToken cancellationToken = default);

    Task<Result<WorkflowDto>> UpdateAsync(
        Guid workflowId, Guid ownerEmployeeId, UpdateWorkflowRequest request, CancellationToken cancellationToken = default);

    Task<Result<WorkflowDto>> SetEnabledAsync(
        Guid workflowId, Guid ownerEmployeeId, SetWorkflowEnabledRequest request, CancellationToken cancellationToken = default);

    Task<Result<bool>> DeleteAsync(
        Guid workflowId, Guid ownerEmployeeId, CancellationToken cancellationToken = default);
}
