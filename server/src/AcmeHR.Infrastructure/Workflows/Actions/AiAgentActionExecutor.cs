using System.Text.Json;
using AcmeHR.Application.Agents;
using AcmeHR.Application.Common;
using AcmeHR.Application.Workflows;
using AcmeHR.Domain.Enums;
using AcmeHR.Infrastructure.Agents;

namespace AcmeHR.Infrastructure.Workflows.Actions;

// Runs the same IAiProvider + AgentToolDispatcher pipeline the board chat assistant uses
// (AgentService.SendMessageAsync), but unattended: a workflow author already opted this node
// into automatic execution by wiring it into a workflow, so every proposed tool call runs
// immediately (executeImmediately: true) - there is no per-run human approval step here, unlike
// the chat surface where that's gated by AgentBoardSettings.AutoExecuteEnabled.
internal static class AiAgentActionExecutor
{
    public static async Task<Result<string>> ExecuteAsync(
        WorkflowNodeDto node,
        Guid workflowOwnerEmployeeId,
        BoardContextBuilder boardContextBuilder,
        IAiProvider aiProvider,
        AgentToolDispatcher toolDispatcher,
        CancellationToken cancellationToken)
    {
        var boardId = node.Data.GetGuid("boardId");
        var instruction = node.Data.GetStringOrNull("instruction");

        if (boardId is null || string.IsNullOrWhiteSpace(instruction))
        {
            return Result<string>.Failure("AI Agent node is missing a board or instruction.");
        }

        var boardContext = await boardContextBuilder.BuildAsync(boardId.Value, cancellationToken);
        var response = await aiProvider.GetChatResponseAsync(
            new AiChatRequest(boardContext, History: [], instruction, ToolsEnabled: true), cancellationToken);

        var actionSummaries = new List<string>();
        var anyFailed = false;

        foreach (var toolCall in response.ProposedToolCalls)
        {
            var audit = await toolDispatcher.CreateProposalAsync(
                boardId.Value, conversationId: null, workflowOwnerEmployeeId, toolCall, executeImmediately: true, cancellationToken);

            actionSummaries.Add(audit.Status == AgentActionStatus.Executed
                ? audit.Summary
                : $"{audit.Summary} (failed: {audit.ResultDetail})");

            if (audit.Status != AgentActionStatus.Executed)
            {
                anyFailed = true;
            }
        }

        var outputJson = JsonSerializer.Serialize(new { reply = response.ReplyText, actions = actionSummaries });

        return anyFailed
            ? Result<string>.Failure($"One or more agent actions failed: {string.Join("; ", actionSummaries)}")
            : Result<string>.Success(outputJson);
    }
}
