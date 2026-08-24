using AcmeHR.Api.Common;
using AcmeHR.Application.Agents;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AcmeHR.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/boards/{boardId:guid}/agent/settings")]
public class AgentSettingsController(IAgentSettingsService agentSettingsService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(Guid boardId, CancellationToken cancellationToken)
    {
        var result = await agentSettingsService.GetAsync(boardId, User.GetEmployeeId(), cancellationToken);
        return result.Succeeded ? Ok(result.Value) : BadRequest(new { error = result.Error });
    }

    [HttpPut]
    public async Task<IActionResult> Update(Guid boardId, UpdateAgentBoardSettingsRequest request, CancellationToken cancellationToken)
    {
        var result = await agentSettingsService.UpdateAsync(boardId, User.GetEmployeeId(), request, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : BadRequest(new { error = result.Error });
    }
}
