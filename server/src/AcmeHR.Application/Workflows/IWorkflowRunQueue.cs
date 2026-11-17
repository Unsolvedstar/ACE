namespace AcmeHR.Application.Workflows;

public interface IWorkflowRunQueue
{
    Task EnqueueAsync(Guid runId, CancellationToken cancellationToken = default);

    IAsyncEnumerable<Guid> ReadAllAsync(CancellationToken cancellationToken);
}
