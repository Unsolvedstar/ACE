using AcmeHR.Application.Agents;
using AcmeHR.Application.Common;
using AcmeHR.Domain.Entities;
using AcmeHR.Domain.Enums;
using AcmeHR.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AcmeHR.Infrastructure.Agents;

public class AgentActionService(ApplicationDbContext dbContext, AgentToolDispatcher toolDispatcher) : IAgentActionService
{
    private static readonly EmployeeRole[] ApproverRoles = [EmployeeRole.LineManager, EmployeeRole.HR, EmployeeRole.Executive];

    public async Task<Result<IReadOnlyList<AgentActionAuditDto>>> GetForBoardAsync(
        Guid boardId, Guid requesterId, AgentActionStatus? status, CancellationToken cancellationToken = default)
    {
        var access = await CheckAccessAsync(boardId, requesterId, cancellationToken);
        if (access is null)
        {
            return Result<IReadOnlyList<AgentActionAuditDto>>.Failure("Board not found.");
        }
        if (!access.Value)
        {
            return Result<IReadOnlyList<AgentActionAuditDto>>.Failure("You are not a member of this board.");
        }

        var query = dbContext.AgentActionAudits
            .Include(a => a.RequestedByEmployee)
            .Include(a => a.DecidedByEmployee)
            .Where(a => a.BoardId == boardId);

        if (status.HasValue)
        {
            query = query.Where(a => a.Status == status.Value);
        }

        var audits = await query.OrderByDescending(a => a.CreatedAtUtc).ToListAsync(cancellationToken);
        return Result<IReadOnlyList<AgentActionAuditDto>>.Success(audits.Select(a => ToDto(a)).ToList());
    }

    public async Task<Result<AgentActionAuditDto>> ApproveAsync(
        Guid boardId, Guid actionId, Guid approverId, CancellationToken cancellationToken = default)
    {
        var canApprove = await CheckApproverAsync(boardId, approverId, cancellationToken);
        if (canApprove != true)
        {
            return Result<AgentActionAuditDto>.Failure("You are not authorized to approve actions on this board.");
        }

        var audit = await dbContext.AgentActionAudits
            .Include(a => a.RequestedByEmployee)
            .FirstOrDefaultAsync(a => a.Id == actionId && a.BoardId == boardId, cancellationToken);
        if (audit is null)
        {
            return Result<AgentActionAuditDto>.Failure("Action not found.");
        }
        if (audit.Status != AgentActionStatus.Proposed)
        {
            return Result<AgentActionAuditDto>.Failure("This action has already been decided.");
        }

        await toolDispatcher.ExecuteAsync(audit, cancellationToken);
        audit.DecidedByEmployeeId = approverId;
        audit.DecidedAtUtc = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        var decidedBy = await dbContext.Employees.FindAsync([approverId], cancellationToken);
        return Result<AgentActionAuditDto>.Success(ToDto(audit, decidedBy));
    }

    public async Task<Result<AgentActionAuditDto>> RejectAsync(
        Guid boardId, Guid actionId, Guid approverId, RejectAgentActionRequest request, CancellationToken cancellationToken = default)
    {
        var canApprove = await CheckApproverAsync(boardId, approverId, cancellationToken);
        if (canApprove != true)
        {
            return Result<AgentActionAuditDto>.Failure("You are not authorized to reject actions on this board.");
        }

        var audit = await dbContext.AgentActionAudits
            .Include(a => a.RequestedByEmployee)
            .FirstOrDefaultAsync(a => a.Id == actionId && a.BoardId == boardId, cancellationToken);
        if (audit is null)
        {
            return Result<AgentActionAuditDto>.Failure("Action not found.");
        }
        if (audit.Status != AgentActionStatus.Proposed)
        {
            return Result<AgentActionAuditDto>.Failure("This action has already been decided.");
        }

        audit.Status = AgentActionStatus.Rejected;
        audit.ResultDetail = request.Reason;
        audit.DecidedByEmployeeId = approverId;
        audit.DecidedAtUtc = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        var decidedBy = await dbContext.Employees.FindAsync([approverId], cancellationToken);
        return Result<AgentActionAuditDto>.Success(ToDto(audit, decidedBy));
    }

    private async Task<bool?> CheckAccessAsync(Guid boardId, Guid requesterId, CancellationToken cancellationToken)
    {
        var board = await dbContext.Boards.FirstOrDefaultAsync(b => b.Id == boardId, cancellationToken);
        if (board is null)
        {
            return null;
        }
        if (board.OwnerEmployeeId == requesterId)
        {
            return true;
        }
        return await dbContext.BoardMembers.AnyAsync(m => m.BoardId == boardId && m.EmployeeId == requesterId, cancellationToken);
    }

    private async Task<bool?> CheckApproverAsync(Guid boardId, Guid approverId, CancellationToken cancellationToken)
    {
        var board = await dbContext.Boards.FirstOrDefaultAsync(b => b.Id == boardId, cancellationToken);
        if (board is null)
        {
            return null;
        }
        if (board.OwnerEmployeeId == approverId)
        {
            return true;
        }

        var isMember = await dbContext.BoardMembers.AnyAsync(m => m.BoardId == boardId && m.EmployeeId == approverId, cancellationToken);
        if (!isMember)
        {
            return false;
        }

        var employee = await dbContext.Employees.FindAsync([approverId], cancellationToken);
        return employee is not null && ApproverRoles.Contains(employee.Role);
    }

    private static AgentActionAuditDto ToDto(AgentActionAudit audit, Employee? decidedByOverride = null)
    {
        var decidedBy = decidedByOverride ?? audit.DecidedByEmployee;
        return new AgentActionAuditDto(
            audit.Id,
            audit.BoardId,
            audit.ToolName,
            audit.Summary,
            audit.TargetTaskId,
            audit.Status,
            audit.ResultDetail,
            audit.RequestedByEmployeeId,
            audit.RequestedByEmployee?.FullName ?? "Unknown",
            audit.DecidedByEmployeeId,
            decidedBy?.FullName,
            audit.DecidedAtUtc,
            audit.CreatedAtUtc,
            audit.ExecutedAtUtc);
    }
}
