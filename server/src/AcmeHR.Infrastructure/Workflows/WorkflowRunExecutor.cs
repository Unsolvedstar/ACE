using System.Text.Json;
using AcmeHR.Application.Agents;
using AcmeHR.Application.Boards;
using AcmeHR.Application.Common;
using AcmeHR.Application.Notifications;
using AcmeHR.Application.Workflows;
using AcmeHR.Domain.Entities;
using AcmeHR.Domain.Enums;
using AcmeHR.Infrastructure.Agents;
using AcmeHR.Infrastructure.Persistence;
using AcmeHR.Infrastructure.Workflows.Actions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace AcmeHR.Infrastructure.Workflows;

// The core engine: loads a queued run's workflow graph, walks it from the Manual Trigger node
// following edges, executes each action node, and records a WorkflowRunStep per node. A failed
// node stops only its own downstream branch - sibling branches off the trigger keep running - and
// the run is marked Failed overall if any step failed. Every node executor is expected to return a
// Result rather than throw; this class also wraps the whole walk so a bug here can't crash the
// hosted worker that calls it.
public class WorkflowRunExecutor(
    ApplicationDbContext dbContext,
    WorkflowGraphSecretProtector secretProtector,
    INotificationService notificationService,
    IBoardTaskService boardTaskService,
    IWebhookSender webhookSender,
    IAiProvider aiProvider,
    AgentToolDispatcher agentToolDispatcher,
    BoardContextBuilder boardContextBuilder,
    IWorkflowRunNotifier notifier,
    ILogger<WorkflowRunExecutor> logger) : IWorkflowRunExecutor
{
    private const int MaxSteps = 500;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private class WalkState
    {
        public int Sequence;
        public bool AnyFailure;
    }

    public async Task ExecuteAsync(Guid runId, CancellationToken cancellationToken)
    {
        var run = await dbContext.WorkflowRuns
            .Include(r => r.Workflow)
            .FirstOrDefaultAsync(r => r.Id == runId, cancellationToken);

        if (run is null)
        {
            logger.LogWarning("Workflow run {RunId} not found - nothing to execute.", runId);
            return;
        }

        try
        {
            await RunGraphAsync(run, cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogError(ex, "Workflow run {RunId} failed unexpectedly.", runId);
            await FailRunAsync(run, "Unexpected error executing workflow.", cancellationToken);
        }
    }

    private async Task RunGraphAsync(WorkflowRun run, CancellationToken cancellationToken)
    {
        var graphJson = secretProtector.Unprotect(run.Workflow!.GraphJson);
        var graph = JsonSerializer.Deserialize<WorkflowGraphDto>(graphJson, JsonOptions);

        run.Status = WorkflowRunStatus.Running;
        run.StartedAtUtc = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
        await notifier.NotifyRunUpdatedAsync(run.Id, run.Status.ToString(), cancellationToken);

        if (graph is null || graph.Nodes.Count == 0)
        {
            await FailRunAsync(run, "Workflow graph is empty.", cancellationToken);
            return;
        }

        var triggerNodes = graph.Nodes.Where(n => n.Type == "manualTrigger").ToList();
        if (triggerNodes.Count != 1)
        {
            await FailRunAsync(run, "Workflow must contain exactly one Manual Trigger node.", cancellationToken);
            return;
        }

        var nodesById = graph.Nodes.ToDictionary(n => n.Id);
        var outgoingEdges = graph.Edges.GroupBy(e => e.Source).ToDictionary(g => g.Key, g => g.ToList());

        var context = new WorkflowExecutionContext();
        context.SetTrigger(new { triggeredAtUtc = DateTime.UtcNow, triggeredByEmployeeId = run.TriggeredByEmployeeId });

        var state = new WalkState();
        var visited = new HashSet<string> { triggerNodes[0].Id };
        var queue = new Queue<string>(outgoingEdges.GetValueOrDefault(triggerNodes[0].Id, [])
            .Select(e => e.Target));

        while (queue.Count > 0)
        {
            if (state.Sequence >= MaxSteps)
            {
                await FailRunAsync(run, "Workflow graph exceeded maximum step count (possible cycle).", cancellationToken);
                return;
            }

            var nodeId = queue.Dequeue();
            if (!visited.Add(nodeId) || !nodesById.TryGetValue(nodeId, out var node))
            {
                continue;
            }

            var step = await StartStepAsync(run, node, ++state.Sequence, cancellationToken);
            var actionResult = await ExecuteNodeAsync(node, context, run, cancellationToken);
            await CompleteStepAsync(run, step, actionResult, cancellationToken);

            if (!actionResult.Succeeded)
            {
                state.AnyFailure = true;
                continue; // Do not enqueue this node's outgoing edges - only this branch stops.
            }

            context.SetStepOutput(node.Id, actionResult.Value);

            if (node.Type == "condition")
            {
                var takenBranch = actionResult.Value!.Contains("\"result\":true") ? "true" : "false";
                foreach (var edge in outgoingEdges.GetValueOrDefault(node.Id, []))
                {
                    if (string.Equals(edge.SourceHandle, takenBranch, StringComparison.OrdinalIgnoreCase))
                    {
                        queue.Enqueue(edge.Target);
                    }
                    else
                    {
                        await MarkBranchSkippedAsync(run.Id, edge.Target, nodesById, outgoingEdges, visited, state, cancellationToken);
                    }
                }
            }
            else
            {
                foreach (var edge in outgoingEdges.GetValueOrDefault(node.Id, []))
                {
                    queue.Enqueue(edge.Target);
                }
            }
        }

        run.Status = state.AnyFailure ? WorkflowRunStatus.Failed : WorkflowRunStatus.Succeeded;
        run.ErrorMessage = state.AnyFailure ? "One or more steps failed - see step details." : null;
        run.CompletedAtUtc = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
        await notifier.NotifyRunUpdatedAsync(run.Id, run.Status.ToString(), cancellationToken);
    }

    private async Task<Result<string>> ExecuteNodeAsync(
        WorkflowNodeDto node, WorkflowExecutionContext context, WorkflowRun run, CancellationToken cancellationToken)
    {
        try
        {
            return node.Type switch
            {
                "notification" => await NotificationActionExecutor.ExecuteAsync(node, notificationService, cancellationToken),
                "webhook" => await WebhookActionExecutor.ExecuteAsync(node, webhookSender, cancellationToken),
                "boardTask" => await BoardTaskActionExecutor.ExecuteAsync(
                    node, run.Workflow!.OwnerEmployeeId, boardTaskService, cancellationToken),
                "condition" => ConditionActionExecutor.Execute(node, context),
                "code" => CodeActionExecutor.Execute(node, context),
                "aiAgent" => await AiAgentActionExecutor.ExecuteAsync(
                    node, run.Workflow!.OwnerEmployeeId, boardContextBuilder, aiProvider, agentToolDispatcher, cancellationToken),
                _ => Result<string>.Failure($"Unknown node type \"{node.Type}\"."),
            };
        }
        catch (Exception ex)
        {
            // Belt-and-suspenders: every action executor above already catches its own failures
            // and returns a Result, but a bug in one shouldn't be able to abort the whole run.
            return Result<string>.Failure($"Node execution failed: {ex.Message}");
        }
    }

    private async Task<WorkflowRunStep> StartStepAsync(
        WorkflowRun run, WorkflowNodeDto node, int sequenceNumber, CancellationToken cancellationToken)
    {
        var step = new WorkflowRunStep
        {
            Id = Guid.NewGuid(),
            WorkflowRunId = run.Id,
            NodeId = node.Id,
            NodeType = node.Type,
            Status = WorkflowStepStatus.Running,
            StartedAtUtc = DateTime.UtcNow,
            SequenceNumber = sequenceNumber,
        };

        dbContext.WorkflowRunSteps.Add(step);
        await dbContext.SaveChangesAsync(cancellationToken);
        await notifier.NotifyStepUpdatedAsync(run.Id, step.Id, step.NodeId, step.Status.ToString(), cancellationToken);

        return step;
    }

    private async Task CompleteStepAsync(
        WorkflowRun run, WorkflowRunStep step, Result<string> actionResult, CancellationToken cancellationToken)
    {
        step.CompletedAtUtc = DateTime.UtcNow;
        if (actionResult.Succeeded)
        {
            step.Status = WorkflowStepStatus.Succeeded;
            step.OutputJson = actionResult.Value;
        }
        else
        {
            step.Status = WorkflowStepStatus.Failed;
            step.ErrorMessage = actionResult.Error;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        await notifier.NotifyStepUpdatedAsync(run.Id, step.Id, step.NodeId, step.Status.ToString(), cancellationToken);
    }

    // Walks the untaken side of a condition branch, recording each node as Skipped (rather than
    // leaving it silently absent from the run) without executing it.
    private async Task MarkBranchSkippedAsync(
        Guid runId, string startNodeId, Dictionary<string, WorkflowNodeDto> nodesById,
        Dictionary<string, List<WorkflowEdgeDto>> outgoingEdges, HashSet<string> visited, WalkState state,
        CancellationToken cancellationToken)
    {
        var queue = new Queue<string>();
        queue.Enqueue(startNodeId);

        while (queue.Count > 0)
        {
            var nodeId = queue.Dequeue();
            if (!visited.Add(nodeId) || !nodesById.TryGetValue(nodeId, out var node))
            {
                continue;
            }

            dbContext.WorkflowRunSteps.Add(new WorkflowRunStep
            {
                Id = Guid.NewGuid(),
                WorkflowRunId = runId,
                NodeId = node.Id,
                NodeType = node.Type,
                Status = WorkflowStepStatus.Skipped,
                SequenceNumber = ++state.Sequence,
            });

            foreach (var edge in outgoingEdges.GetValueOrDefault(nodeId, []))
            {
                queue.Enqueue(edge.Target);
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task FailRunAsync(WorkflowRun run, string errorMessage, CancellationToken cancellationToken)
    {
        run.Status = WorkflowRunStatus.Failed;
        run.ErrorMessage = errorMessage;
        run.CompletedAtUtc = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
        await notifier.NotifyRunUpdatedAsync(run.Id, run.Status.ToString(), cancellationToken);
    }
}
