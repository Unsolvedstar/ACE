using AcmeHR.Application.Common;
using AcmeHR.Application.Workflows;
using AcmeHR.Domain.Entities;
using AcmeHR.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AcmeHR.Infrastructure.Workflows;

public class WorkflowService(ApplicationDbContext dbContext, WorkflowGraphSecretProtector secretProtector) : IWorkflowService
{
    // Every new workflow starts with a single Manual Trigger node so the canvas always has
    // something to render and the executor always has a starting point to search for.
    private const string StarterGraphJson =
        """{"nodes":[{"id":"trigger-1","type":"manualTrigger","position":{"x":0,"y":0},"data":{"label":"Manual Trigger"}}],"edges":[]}""";

    public async Task<Result<WorkflowDto>> CreateAsync(
        Guid ownerEmployeeId, CreateWorkflowRequest request, CancellationToken cancellationToken = default)
    {
        var owner = await dbContext.Employees.FindAsync([ownerEmployeeId], cancellationToken);
        if (owner is null)
        {
            return Result<WorkflowDto>.Failure("Employee profile not found.");
        }

        var workflow = new Workflow
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Description = request.Description,
            OwnerEmployeeId = ownerEmployeeId,
            GraphJson = StarterGraphJson,
        };

        dbContext.Workflows.Add(workflow);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<WorkflowDto>.Success(await LoadDtoAsync(workflow.Id, cancellationToken));
    }

    public async Task<IReadOnlyList<WorkflowSummaryDto>> GetMineAsync(
        Guid employeeId, CancellationToken cancellationToken = default) =>
        await dbContext.Workflows
            .Include(w => w.OwnerEmployee)
            .Where(w => w.OwnerEmployeeId == employeeId)
            .OrderByDescending(w => w.CreatedAtUtc)
            .Select(w => new WorkflowSummaryDto(
                w.Id, w.Name, w.Description, w.IsEnabled, w.OwnerEmployeeId, w.OwnerEmployee!.FullName,
                w.CreatedAtUtc, w.UpdatedAtUtc))
            .ToListAsync(cancellationToken);

    public async Task<Result<WorkflowDto>> GetByIdAsync(
        Guid workflowId, Guid requesterId, CancellationToken cancellationToken = default)
    {
        var workflow = await dbContext.Workflows.FirstOrDefaultAsync(w => w.Id == workflowId, cancellationToken);
        if (workflow is null)
        {
            return Result<WorkflowDto>.Failure("Workflow not found.");
        }

        if (workflow.OwnerEmployeeId != requesterId)
        {
            return Result<WorkflowDto>.Failure("Only the workflow owner can view this workflow.");
        }

        return Result<WorkflowDto>.Success(await LoadDtoAsync(workflowId, cancellationToken));
    }

    public async Task<Result<WorkflowDto>> UpdateAsync(
        Guid workflowId, Guid ownerEmployeeId, UpdateWorkflowRequest request, CancellationToken cancellationToken = default)
    {
        var workflow = await dbContext.Workflows.FirstOrDefaultAsync(w => w.Id == workflowId, cancellationToken);
        if (workflow is null)
        {
            return Result<WorkflowDto>.Failure("Workflow not found.");
        }

        if (workflow.OwnerEmployeeId != ownerEmployeeId)
        {
            return Result<WorkflowDto>.Failure("Only the workflow owner can update this workflow.");
        }

        workflow.Name = request.Name;
        workflow.Description = request.Description;
        workflow.GraphJson = secretProtector.Protect(request.GraphJson);
        workflow.UpdatedAtUtc = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<WorkflowDto>.Success(await LoadDtoAsync(workflowId, cancellationToken));
    }

    public async Task<Result<WorkflowDto>> SetEnabledAsync(
        Guid workflowId, Guid ownerEmployeeId, SetWorkflowEnabledRequest request, CancellationToken cancellationToken = default)
    {
        var workflow = await dbContext.Workflows.FirstOrDefaultAsync(w => w.Id == workflowId, cancellationToken);
        if (workflow is null)
        {
            return Result<WorkflowDto>.Failure("Workflow not found.");
        }

        if (workflow.OwnerEmployeeId != ownerEmployeeId)
        {
            return Result<WorkflowDto>.Failure("Only the workflow owner can change this workflow's enabled state.");
        }

        workflow.IsEnabled = request.IsEnabled;
        workflow.UpdatedAtUtc = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<WorkflowDto>.Success(await LoadDtoAsync(workflowId, cancellationToken));
    }

    public async Task<Result<bool>> DeleteAsync(
        Guid workflowId, Guid ownerEmployeeId, CancellationToken cancellationToken = default)
    {
        var workflow = await dbContext.Workflows.FirstOrDefaultAsync(w => w.Id == workflowId, cancellationToken);
        if (workflow is null)
        {
            return Result<bool>.Failure("Workflow not found.");
        }

        if (workflow.OwnerEmployeeId != ownerEmployeeId)
        {
            return Result<bool>.Failure("Only the workflow owner can delete this workflow.");
        }

        dbContext.Workflows.Remove(workflow);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(true);
    }

    private async Task<WorkflowDto> LoadDtoAsync(Guid workflowId, CancellationToken cancellationToken)
    {
        var workflow = await dbContext.Workflows
            .Include(w => w.OwnerEmployee)
            .FirstAsync(w => w.Id == workflowId, cancellationToken);

        return ToDto(workflow, secretProtector.Unprotect(workflow.GraphJson));
    }

    private static WorkflowDto ToDto(Workflow workflow, string decryptedGraphJson) => new(
        workflow.Id,
        workflow.Name,
        workflow.Description,
        workflow.IsEnabled,
        workflow.OwnerEmployeeId,
        workflow.OwnerEmployee!.FullName,
        decryptedGraphJson,
        workflow.CreatedAtUtc,
        workflow.UpdatedAtUtc);
}
