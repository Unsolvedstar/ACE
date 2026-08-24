using AcmeHR.Api.Common;
using AcmeHR.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace AcmeHR.Api.Hubs;

[Authorize]
public class BoardHub(ApplicationDbContext dbContext) : Hub
{
    public async Task JoinBoard(Guid boardId)
    {
        var employeeId = Context.User!.GetEmployeeId();
        var isMember = await dbContext.Boards.AnyAsync(b => b.Id == boardId &&
            (b.OwnerEmployeeId == employeeId || b.Members.Any(m => m.EmployeeId == employeeId)));
        if (!isMember)
        {
            throw new HubException("You are not a member of this board.");
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, BoardHubGroups.For(boardId));
    }

    public Task LeaveBoard(Guid boardId) =>
        Groups.RemoveFromGroupAsync(Context.ConnectionId, BoardHubGroups.For(boardId));
}

public static class BoardHubGroups
{
    public static string For(Guid boardId) => $"board-{boardId}";
}
