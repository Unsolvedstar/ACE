using AcmeHR.Application.Common;
using AcmeHR.Application.Workflows;
using AcmeHR.Domain.Entities;
using AcmeHR.Domain.Enums;
using AcmeHR.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AcmeHR.Infrastructure.Workflows;

public class WorkflowRunService(ApplicationDbContext dbContext, IWorkflowRunQueue queue) : IWorkflowRunService
{
    public async Task<Result<WorkflowRunDto>> TriggerAsync(
        Guid workflowId, Guid requesterId, CancellationToken cancellationToken = default)
    {
        var workflow = await dbContext.Workflows.FirstOrDefaultAsync(w => w.Id == workflowId, cancellationToken);
        if (workflow is null)
        {
            return Result<WorkflowRunDto>.Failure("Workflow not found.");
        }

        if (workflow.OwnerEmployeeId != requesterId)
        {
            return Result<WorkflowRunDto>.Failure("Only the workflow owner can run this workflow.");
        }

        var run = new WorkflowRun
        {
            Id = Guid.NewGuid(),
            WorkflowId = workflowId,
            TriggeredByEmployeeId = requesterId,
            Status = WorkflowRunStatus.Queued,
        };

        dbContext.WorkflowRuns.Add(run);
        await dbContext.SaveChangesAsync(cancellationToken);

        // Enqueue after the row is committed so the worker can always find it by id.
        await queue.EnqueueAsync(run.Id, cancellationToken);

        return Result<WorkflowRunDto>.Success(await LoadDtoAsync(run.Id, cancellationToken));
    }

    public async Task<Result<IReadOnlyList<WorkflowRunDto>>> GetHistoryAsync(
        Guid workflowId, Guid requesterId, CancellationToken cancellationToken = default)
    {
        var access = await CheckOwnerAsync(workflowId, requesterId, cancellationToken);
        if (!access.Succeeded)
        {
            return Result<IReadOnlyList<WorkflowRunDto>>.Failure(access.Error!);
        }

        var runIds = await dbContext.WorkflowRuns
            .Where(r => r.WorkflowId == workflowId)
            .OrderByDescending(r => r.QueuedAtUtc)
            .Take(50)
            .Select(r => r.Id)
            .ToListAsync(cancellationToken);

        var runs = new List<WorkflowRunDto>();
        foreach (var runId in runIds)
        {
            runs.Add(await LoadDtoAsync(runId, cancellationToken));
        }

        return Result<IReadOnlyList<WorkflowRunDto>>.Success(runs);
    }

    public async Task<Result<WorkflowRunDto>> GetByIdAsync(
        Guid workflowId, Guid runId, Guid requesterId, CancellationToken cancellationToken = default)
    {
        var access = await CheckOwnerAsync(workflowId, requesterId, cancellationToken);
        if (!access.Succeeded)
        {
            return Result<WorkflowRunDto>.Failure(access.Error!);
        }

        var exists = await dbContext.WorkflowRuns.AnyAsync(r => r.Id == runId && r.WorkflowId == workflowId, cancellationToken);
        if (!exists)
        {
            return Result<WorkflowRunDto>.Failure("Workflow run not found.");
        }

        return Result<WorkflowRunDto>.Success(await LoadDtoAsync(runId, cancellationToken));
    }

    private async Task<Result<bool>> CheckOwnerAsync(Guid workflowId, Guid requesterId, CancellationToken cancellationToken)
    {
        var workflow = await dbContext.Workflows.FirstOrDefaultAsync(w => w.Id == workflowId, cancellationToken);
        if (workflow is null)
        {
            return Result<bool>.Failure("Workflow not found.");
        }

        if (workflow.OwnerEmployeeId != requesterId)
        {
            return Result<bool>.Failure("Only the workflow owner can view this workflow's runs.");
        }

        return Result<bool>.Success(true);
    }

    private async Task<WorkflowRunDto> LoadDtoAsync(Guid runId, CancellationToken cancellationToken)
    {
        var run = await dbContext.WorkflowRuns
            .Include(r => r.TriggeredByEmployee)
            .Include(r => r.Steps)
            .FirstAsync(r => r.Id == runId, cancellationToken);

        return ToDto(run);
    }

    private static WorkflowRunDto ToDto(WorkflowRun run) => new(
        run.Id,
        run.WorkflowId,
        run.Status,
        run.TriggeredByEmployeeId,
        run.TriggeredByEmployee!.FullName,
        run.QueuedAtUtc,
        run.StartedAtUtc,
        run.CompletedAtUtc,
        run.ErrorMessage,
        run.Steps
            .OrderBy(s => s.SequenceNumber)
            .Select(s => new WorkflowRunStepDto(
                s.Id, s.NodeId, s.NodeType, s.Status, s.InputJson, s.OutputJson, s.ErrorMessage,
                s.StartedAtUtc, s.CompletedAtUtc, s.SequenceNumber))
            .ToList());
}
