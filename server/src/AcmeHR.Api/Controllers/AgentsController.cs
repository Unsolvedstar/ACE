using AcmeHR.Api.Common;
using AcmeHR.Api.Hubs;
using AcmeHR.Application.Agents;
using AcmeHR.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace AcmeHR.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/boards/{boardId:guid}/agent")]
public class AgentsController(IAgentService agentService, IHubContext<BoardHub> boardHub) : ControllerBase
{
    [HttpGet("conversation")]
    public async Task<IActionResult> GetConversation(Guid boardId, CancellationToken cancellationToken)
    {
        var result = await agentService.GetOrCreateConversationAsync(boardId, User.GetEmployeeId(), cancellationToken);
        return result.Succeeded ? Ok(result.Value) : BadRequest(new { error = result.Error });
    }

    [HttpGet("messages")]
    public async Task<IActionResult> GetMessages(Guid boardId, CancellationToken cancellationToken)
    {
        var result = await agentService.GetMessagesAsync(boardId, User.GetEmployeeId(), cancellationToken);
        return result.Succeeded ? Ok(result.Value) : BadRequest(new { error = result.Error });
    }

    [HttpPost("messages")]
    public async Task<IActionResult> SendMessage(Guid boardId, SendAgentMessageRequest request, CancellationToken cancellationToken)
    {
        var result = await agentService.SendMessageAsync(boardId, User.GetEmployeeId(), request, cancellationToken);
        if (result.Succeeded && result.Value!.ProposedActions.Count > 0)
        {
            await NotifyAgentActivityAsync(boardId, cancellationToken);
            if (result.Value.ProposedActions.Any(a => a.Status == AgentActionStatus.Executed))
            {
                await NotifyBoardUpdatedAsync(boardId, cancellationToken);
            }
        }
        return result.Succeeded ? Ok(result.Value) : BadRequest(new { error = result.Error });
    }

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary(Guid boardId, [FromQuery] DateOnly? sinceDate, CancellationToken cancellationToken)
    {
        var result = await agentService.GetStandupSummaryAsync(boardId, User.GetEmployeeId(), sinceDate, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : BadRequest(new { error = result.Error });
    }

    private Task NotifyAgentActivityAsync(Guid boardId, CancellationToken cancellationToken) =>
        boardHub.Clients.Group(BoardHubGroups.For(boardId)).SendAsync("AgentActivityUpdated", boardId, cancellationToken);

    private Task NotifyBoardUpdatedAsync(Guid boardId, CancellationToken cancellationToken) =>
        boardHub.Clients.Group(BoardHubGroups.For(boardId)).SendAsync("BoardUpdated", boardId, cancellationToken);
}
