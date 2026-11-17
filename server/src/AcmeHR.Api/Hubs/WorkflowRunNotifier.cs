using AcmeHR.Application.Workflows;
using Microsoft.AspNetCore.SignalR;

namespace AcmeHR.Api.Hubs;

public class WorkflowRunNotifier(IHubContext<WorkflowHub> hubContext) : IWorkflowRunNotifier
{
    public Task NotifyRunUpdatedAsync(Guid runId, string status, CancellationToken cancellationToken = default) =>
        hubContext.Clients.Group(WorkflowHubGroups.For(runId))
            .SendAsync("RunUpdated", new { runId, status }, cancellationToken);

    public Task NotifyStepUpdatedAsync(
        Guid runId, Guid stepId, string nodeId, string status, CancellationToken cancellationToken = default) =>
        hubContext.Clients.Group(WorkflowHubGroups.For(runId))
            .SendAsync("StepUpdated", new { runId, stepId, nodeId, status }, cancellationToken);
}
