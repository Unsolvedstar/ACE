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
[Route("api/boards/{boardId:guid}/agent/actions")]
public class AgentActionsController(IAgentActionService agentActionService, IHubContext<BoardHub> boardHub) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetForBoard(Guid boardId, [FromQuery] AgentActionStatus? status, CancellationToken cancellationToken)
    {
        var result = await agentActionService.GetForBoardAsync(boardId, User.GetEmployeeId(), status, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : BadRequest(new { error = result.Error });
    }

    [HttpPost("{actionId:guid}/approve")]
    public async Task<IActionResult> Approve(Guid boardId, Guid actionId, CancellationToken cancellationToken)
    {
        var result = await agentActionService.ApproveAsync(boardId, actionId, User.GetEmployeeId(), cancellationToken);
        if (result.Succeeded)
        {
            await NotifyAgentActivityAsync(boardId, cancellationToken);
            if (result.Value!.Status == AgentActionStatus.Executed)
            {
                await NotifyBoardUpdatedAsync(boardId, cancellationToken);
            }
        }
        return result.Succeeded ? Ok(result.Value) : BadRequest(new { error = result.Error });
    }

    [HttpPost("{actionId:guid}/reject")]
    public async Task<IActionResult> Reject(
        Guid boardId, Guid actionId, RejectAgentActionRequest request, CancellationToken cancellationToken)
    {
        var result = await agentActionService.RejectAsync(boardId, actionId, User.GetEmployeeId(), request, cancellationToken);
        if (result.Succeeded)
        {
            await NotifyAgentActivityAsync(boardId, cancellationToken);
        }
        return result.Succeeded ? Ok(result.Value) : BadRequest(new { error = result.Error });
    }

    private Task NotifyAgentActivityAsync(Guid boardId, CancellationToken cancellationToken) =>
        boardHub.Clients.Group(BoardHubGroups.For(boardId)).SendAsync("AgentActivityUpdated", boardId, cancellationToken);

    private Task NotifyBoardUpdatedAsync(Guid boardId, CancellationToken cancellationToken) =>
        boardHub.Clients.Group(BoardHubGroups.For(boardId)).SendAsync("BoardUpdated", boardId, cancellationToken);
}
