namespace AcmeHR.Application.Workflows;

// Bridges the execution engine (Infrastructure, runs inside a BackgroundService with no HTTP
// request in flight) to the SignalR hub (Api layer only - Infrastructure can't reference it
// directly, same reason BoardHub pushes are only ever made from controllers, not services).
public interface IWorkflowRunNotifier
{
    Task NotifyRunUpdatedAsync(Guid runId, string status, CancellationToken cancellationToken = default);

    Task NotifyStepUpdatedAsync(
        Guid runId, Guid stepId, string nodeId, string status, CancellationToken cancellationToken = default);
}
