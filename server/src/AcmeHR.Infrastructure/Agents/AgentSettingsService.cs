using AcmeHR.Application.Agents;
using AcmeHR.Application.Common;
using AcmeHR.Domain.Entities;
using AcmeHR.Domain.Enums;
using AcmeHR.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AcmeHR.Infrastructure.Agents;

public class AgentSettingsService(ApplicationDbContext dbContext) : IAgentSettingsService
{
    private static readonly EmployeeRole[] ManagerRoles = [EmployeeRole.LineManager, EmployeeRole.HR, EmployeeRole.Executive];

    public async Task<Result<AgentBoardSettingsDto>> GetAsync(
        Guid boardId, Guid requesterId, CancellationToken cancellationToken = default)
    {
        var access = await CheckAccessAsync(boardId, requesterId, cancellationToken);
        if (access is null)
        {
            return Result<AgentBoardSettingsDto>.Failure("Board not found.");
        }
        if (!access.Value)
        {
            return Result<AgentBoardSettingsDto>.Failure("You are not a member of this board.");
        }

        var settings = await dbContext.AgentBoardSettings.FirstOrDefaultAsync(s => s.BoardId == boardId, cancellationToken);
        return Result<AgentBoardSettingsDto>.Success(settings is null
            ? new AgentBoardSettingsDto(boardId, AutoExecuteEnabled: false, UpdatedAtUtc: DateTime.UtcNow)
            : new AgentBoardSettingsDto(settings.BoardId, settings.AutoExecuteEnabled, settings.UpdatedAtUtc));
    }

    public async Task<Result<AgentBoardSettingsDto>> UpdateAsync(
        Guid boardId, Guid requesterId, UpdateAgentBoardSettingsRequest request, CancellationToken cancellationToken = default)
    {
        var canManage = await CheckCanManageAsync(boardId, requesterId, cancellationToken);
        if (canManage is null)
        {
            return Result<AgentBoardSettingsDto>.Failure("Board not found.");
        }
        if (!canManage.Value)
        {
            return Result<AgentBoardSettingsDto>.Failure("Only the board owner or a manager can change these settings.");
        }

        var settings = await dbContext.AgentBoardSettings.FirstOrDefaultAsync(s => s.BoardId == boardId, cancellationToken);
        if (settings is null)
        {
            settings = new AgentBoardSettings { Id = Guid.NewGuid(), BoardId = boardId };
            dbContext.AgentBoardSettings.Add(settings);
        }

        settings.AutoExecuteEnabled = request.AutoExecuteEnabled;
        settings.UpdatedByEmployeeId = requesterId;
        settings.UpdatedAtUtc = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<AgentBoardSettingsDto>.Success(new AgentBoardSettingsDto(settings.BoardId, settings.AutoExecuteEnabled, settings.UpdatedAtUtc));
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

    private async Task<bool?> CheckCanManageAsync(Guid boardId, Guid requesterId, CancellationToken cancellationToken)
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

        var isMember = await dbContext.BoardMembers.AnyAsync(m => m.BoardId == boardId && m.EmployeeId == requesterId, cancellationToken);
        if (!isMember)
        {
            return false;
        }

        var employee = await dbContext.Employees.FindAsync([requesterId], cancellationToken);
        return employee is not null && ManagerRoles.Contains(employee.Role);
    }
}
