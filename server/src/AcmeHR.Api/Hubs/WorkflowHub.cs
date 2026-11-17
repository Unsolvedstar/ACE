using AcmeHR.Api.Common;
using AcmeHR.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace AcmeHR.Api.Hubs;

[Authorize]
public class WorkflowHub(ApplicationDbContext dbContext) : Hub
{
    public async Task JoinRun(Guid runId)
    {
        var employeeId = Context.User!.GetEmployeeId();
        var isOwner = await dbContext.WorkflowRuns
            .AnyAsync(r => r.Id == runId && r.Workflow!.OwnerEmployeeId == employeeId);
        if (!isOwner)
        {
            throw new HubException("You do not have access to this workflow run.");
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, WorkflowHubGroups.For(runId));
    }

    public Task LeaveRun(Guid runId) =>
        Groups.RemoveFromGroupAsync(Context.ConnectionId, WorkflowHubGroups.For(runId));
}

public static class WorkflowHubGroups
{
    public static string For(Guid runId) => $"workflow-run-{runId}";
}
