using System.Text.Json;
using AcmeHR.Application.Agents;
using AcmeHR.Application.Boards;
using AcmeHR.Domain.Entities;
using AcmeHR.Domain.Enums;
using AcmeHR.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AcmeHR.Infrastructure.Agents;

/// <summary>
/// Translates an AiToolCall proposed by the agent into a call against the existing, already
/// board-membership-authorized IBoardTaskService — no new mutation methods or permission logic
/// are added, this is a thin translator plus an audit trail. Every dispatched call is attributed
/// to AgentActionAudit.RequestedByEmployeeId (the human whose chat turn triggered it), whether it
/// executes immediately or later once a manager approves it.
/// </summary>
public class AgentToolDispatcher(IBoardTaskService boardTaskService, ApplicationDbContext dbContext)
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private record CreateTaskArgs(string Title, string? Description, Guid? AssigneeEmployeeId, DateOnly? DueDate);
    private record UpdateTaskStatusArgs(Guid TaskId, BoardTaskStatus Status);
    private record AssignTaskArgs(Guid TaskId, Guid AssigneeEmployeeId);
    private record SetDeadlineArgs(Guid TaskId, DateOnly DueDate);

    public async Task<AgentActionAudit> CreateProposalAsync(
        Guid boardId, Guid? conversationId, Guid requestedByEmployeeId, AiToolCall toolCall,
        bool executeImmediately, CancellationToken cancellationToken)
    {
        var audit = new AgentActionAudit
        {
            Id = Guid.NewGuid(),
            BoardId = boardId,
            ConversationId = conversationId,
            RequestedByEmployeeId = requestedByEmployeeId,
            ArgumentsJson = toolCall.ArgumentsJson,
        };

        if (!Enum.TryParse<AgentToolName>(toolCall.ToolName, out var toolName))
        {
            audit.ToolName = AgentToolName.CreateTask;
            audit.Status = AgentActionStatus.Failed;
            audit.Summary = $"Unrecognized action '{toolCall.ToolName}'.";
            audit.ResultDetail = "The assistant proposed an action this system doesn't support.";
            dbContext.AgentActionAudits.Add(audit);
            await dbContext.SaveChangesAsync(cancellationToken);
            return audit;
        }

        audit.ToolName = toolName;
        audit.Summary = await BuildSummaryAsync(toolName, toolCall.ArgumentsJson, cancellationToken);
        audit.TargetTaskId = TryGetExistingTaskId(toolName, toolCall.ArgumentsJson);

        if (executeImmediately)
        {
            await ExecuteCoreAsync(audit, cancellationToken);
        }

        dbContext.AgentActionAudits.Add(audit);
        await dbContext.SaveChangesAsync(cancellationToken);
        return audit;
    }

    public async Task ExecuteAsync(AgentActionAudit audit, CancellationToken cancellationToken)
    {
        await ExecuteCoreAsync(audit, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task ExecuteCoreAsync(AgentActionAudit audit, CancellationToken cancellationToken)
    {
        try
        {
            switch (audit.ToolName)
            {
                case AgentToolName.CreateTask:
                {
                    var args = Deserialize<CreateTaskArgs>(audit.ArgumentsJson);
                    var result = await boardTaskService.CreateAsync(
                        audit.BoardId, audit.RequestedByEmployeeId,
                        new CreateBoardTaskRequest(args.Title, args.Description, args.AssigneeEmployeeId, args.DueDate),
                        cancellationToken);
                    if (!result.Succeeded)
                    {
                        throw new InvalidOperationException(result.Error);
                    }
                    audit.TargetTaskId = result.Value!.Id;
                    audit.ResultDetail = "Task created.";
                    break;
                }
                case AgentToolName.UpdateTaskStatus:
                {
                    var args = Deserialize<UpdateTaskStatusArgs>(audit.ArgumentsJson);
                    var result = await boardTaskService.ChangeStatusAsync(
                        audit.BoardId, args.TaskId, audit.RequestedByEmployeeId,
                        new ChangeTaskStatusRequest(args.Status), cancellationToken);
                    if (!result.Succeeded)
                    {
                        throw new InvalidOperationException(result.Error);
                    }
                    audit.ResultDetail = "Status updated.";
                    break;
                }
                case AgentToolName.AssignTask:
                {
                    var args = Deserialize<AssignTaskArgs>(audit.ArgumentsJson);
                    var current = await boardTaskService.GetByIdAsync(
                        audit.BoardId, args.TaskId, audit.RequestedByEmployeeId, cancellationToken);
                    if (!current.Succeeded)
                    {
                        throw new InvalidOperationException(current.Error);
                    }
                    var result = await boardTaskService.UpdateAsync(
                        audit.BoardId, args.TaskId, audit.RequestedByEmployeeId,
                        new UpdateBoardTaskRequest(current.Value!.Title, current.Value.Description, args.AssigneeEmployeeId, current.Value.DueDate),
                        cancellationToken);
                    if (!result.Succeeded)
                    {
                        throw new InvalidOperationException(result.Error);
                    }
                    audit.ResultDetail = "Assignee updated.";
                    break;
                }
                case AgentToolName.SetDeadline:
                {
                    var args = Deserialize<SetDeadlineArgs>(audit.ArgumentsJson);
                    var current = await boardTaskService.GetByIdAsync(
                        audit.BoardId, args.TaskId, audit.RequestedByEmployeeId, cancellationToken);
                    if (!current.Succeeded)
                    {
                        throw new InvalidOperationException(current.Error);
                    }
                    var result = await boardTaskService.UpdateAsync(
                        audit.BoardId, args.TaskId, audit.RequestedByEmployeeId,
                        new UpdateBoardTaskRequest(current.Value!.Title, current.Value.Description, current.Value.AssigneeEmployeeId, args.DueDate),
                        cancellationToken);
                    if (!result.Succeeded)
                    {
                        throw new InvalidOperationException(result.Error);
                    }
                    audit.ResultDetail = "Deadline updated.";
                    break;
                }
            }

            audit.Status = AgentActionStatus.Executed;
            audit.ExecutedAtUtc = DateTime.UtcNow;
        }
        catch (Exception ex)
        {
            audit.Status = AgentActionStatus.Failed;
            audit.ResultDetail = ex.Message;
        }
    }

    private async Task<string> BuildSummaryAsync(AgentToolName toolName, string argumentsJson, CancellationToken cancellationToken)
    {
        switch (toolName)
        {
            case AgentToolName.CreateTask:
            {
                var args = Deserialize<CreateTaskArgs>(argumentsJson);
                var assigneeText = args.AssigneeEmployeeId is { } assigneeId
                    ? $" assigned to {await GetEmployeeNameAsync(assigneeId, cancellationToken)}"
                    : string.Empty;
                var dueText = args.DueDate is { } due ? $", due {due:d MMM yyyy}" : string.Empty;
                return $"Create task \"{args.Title}\"{assigneeText}{dueText}";
            }
            case AgentToolName.UpdateTaskStatus:
            {
                var args = Deserialize<UpdateTaskStatusArgs>(argumentsJson);
                var title = await GetTaskTitleAsync(args.TaskId, cancellationToken);
                return $"Move \"{title}\" to {args.Status}";
            }
            case AgentToolName.AssignTask:
            {
                var args = Deserialize<AssignTaskArgs>(argumentsJson);
                var title = await GetTaskTitleAsync(args.TaskId, cancellationToken);
                var name = await GetEmployeeNameAsync(args.AssigneeEmployeeId, cancellationToken);
                return $"Assign \"{title}\" to {name}";
            }
            case AgentToolName.SetDeadline:
            {
                var args = Deserialize<SetDeadlineArgs>(argumentsJson);
                var title = await GetTaskTitleAsync(args.TaskId, cancellationToken);
                return $"Set deadline for \"{title}\" to {args.DueDate:d MMM yyyy}";
            }
            default:
                return "Unrecognized action.";
        }
    }

    private static Guid? TryGetExistingTaskId(AgentToolName toolName, string argumentsJson) => toolName switch
    {
        AgentToolName.UpdateTaskStatus => Deserialize<UpdateTaskStatusArgs>(argumentsJson).TaskId,
        AgentToolName.AssignTask => Deserialize<AssignTaskArgs>(argumentsJson).TaskId,
        AgentToolName.SetDeadline => Deserialize<SetDeadlineArgs>(argumentsJson).TaskId,
        _ => null,
    };

    private async Task<string> GetEmployeeNameAsync(Guid employeeId, CancellationToken cancellationToken)
    {
        var employee = await dbContext.Employees.FindAsync([employeeId], cancellationToken);
        return employee?.FullName ?? "Unknown employee";
    }

    private async Task<string> GetTaskTitleAsync(Guid taskId, CancellationToken cancellationToken)
    {
        var task = await dbContext.BoardTasks.FindAsync([taskId], cancellationToken);
        return task?.Title ?? "Unknown task";
    }

    private static T Deserialize<T>(string json) =>
        JsonSerializer.Deserialize<T>(json, JsonOptions) ?? throw new InvalidOperationException("Malformed tool call arguments.");
}
