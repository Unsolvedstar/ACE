using AcmeHR.Api.Common;
using AcmeHR.Application.Workflows;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AcmeHR.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/workflows/{workflowId:guid}/runs")]
public class WorkflowRunsController(IWorkflowRunService workflowRunService) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Trigger(Guid workflowId, CancellationToken cancellationToken)
    {
        var result = await workflowRunService.TriggerAsync(workflowId, User.GetEmployeeId(), cancellationToken);
        return result.Succeeded ? Accepted(value: result.Value) : BadRequest(new { error = result.Error });
    }

    [HttpGet]
    public async Task<IActionResult> GetHistory(Guid workflowId, CancellationToken cancellationToken)
    {
        var result = await workflowRunService.GetHistoryAsync(workflowId, User.GetEmployeeId(), cancellationToken);
        return result.Succeeded ? Ok(result.Value) : BadRequest(new { error = result.Error });
    }

    [HttpGet("{runId:guid}")]
    public async Task<IActionResult> GetById(Guid workflowId, Guid runId, CancellationToken cancellationToken)
    {
        var result = await workflowRunService.GetByIdAsync(workflowId, runId, User.GetEmployeeId(), cancellationToken);
        return result.Succeeded ? Ok(result.Value) : BadRequest(new { error = result.Error });
    }
}
