using System.Threading.Channels;
using AcmeHR.Application.Workflows;

namespace AcmeHR.Infrastructure.Workflows;

// Singleton: the channel must be shared between the scoped controller/service call that enqueues
// a run and the singleton-lifetime WorkflowExecutionWorker that drains it.
public class WorkflowRunQueue : IWorkflowRunQueue
{
    private readonly Channel<Guid> _channel = Channel.CreateUnbounded<Guid>();

    public async Task EnqueueAsync(Guid runId, CancellationToken cancellationToken = default) =>
        await _channel.Writer.WriteAsync(runId, cancellationToken);

    public IAsyncEnumerable<Guid> ReadAllAsync(CancellationToken cancellationToken) =>
        _channel.Reader.ReadAllAsync(cancellationToken);
}
