using System.Text.Json;
using AcmeHR.Application.Boards;
using AcmeHR.Application.Common;
using AcmeHR.Application.Workflows;

namespace AcmeHR.Infrastructure.Workflows.Actions;

internal static class BoardTaskActionExecutor
{
    public static async Task<Result<string>> ExecuteAsync(
        WorkflowNodeDto node, Guid requesterId, IBoardTaskService boardTaskService, CancellationToken cancellationToken)
    {
        var boardId = node.Data.GetGuid("boardId");
        var title = node.Data.GetStringOrNull("title");

        if (boardId is null || string.IsNullOrWhiteSpace(title))
        {
            return Result<string>.Failure("Create Board Task node is missing a board or title.");
        }

        var description = node.Data.GetStringOrNull("description");
        var assigneeEmployeeId = node.Data.GetGuid("assigneeEmployeeId");
        var dueDate = node.Data.GetDateOnly("dueDate");

        var result = await boardTaskService.CreateAsync(
            boardId.Value, requesterId, new CreateBoardTaskRequest(title, description, assigneeEmployeeId, dueDate),
            cancellationToken);

        return result.Succeeded
            ? Result<string>.Success(JsonSerializer.Serialize(new { taskId = result.Value!.Id }))
            : Result<string>.Failure(result.Error!);
    }
}
