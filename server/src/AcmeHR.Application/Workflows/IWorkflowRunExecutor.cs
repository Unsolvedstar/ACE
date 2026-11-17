namespace AcmeHR.Application.Workflows;

public interface IWorkflowRunExecutor
{
    Task ExecuteAsync(Guid runId, CancellationToken cancellationToken);
}
