using AcmeHR.Application.Workflows;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace AcmeHR.Infrastructure.Workflows;

// Drains IWorkflowRunQueue and executes each run in its own DI scope, same shape as
// RefreshTokenCleanupService but consuming a Channel via await foreach instead of a PeriodicTimer.
// This keeps "Run now" non-blocking: the controller enqueues and returns immediately, this worker
// does the actual (potentially slow) graph walk off the request thread.
public class WorkflowExecutionWorker(
    IWorkflowRunQueue queue, IServiceScopeFactory scopeFactory, ILogger<WorkflowExecutionWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var runId in queue.ReadAllAsync(stoppingToken))
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var executor = scope.ServiceProvider.GetRequiredService<IWorkflowRunExecutor>();
                await executor.ExecuteAsync(runId, stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                // IWorkflowRunExecutor already catches and records failures against the run itself;
                // this is a last-resort net so a bug in that handling can't take down the worker
                // loop and leave every subsequent queued run stuck forever.
                logger.LogError(ex, "Workflow run {RunId} crashed the execution worker loop unexpectedly.", runId);
            }
        }
    }
}
