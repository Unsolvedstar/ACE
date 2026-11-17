using AcmeHR.Api.Common;
using AcmeHR.Application.Workflows;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AcmeHR.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class WorkflowsController(IWorkflowService workflowService) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create(CreateWorkflowRequest request, CancellationToken cancellationToken)
    {
        var result = await workflowService.CreateAsync(User.GetEmployeeId(), request, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : BadRequest(new { error = result.Error });
    }

    [HttpGet("mine")]
    public async Task<IActionResult> GetMine(CancellationToken cancellationToken)
    {
        var workflows = await workflowService.GetMineAsync(User.GetEmployeeId(), cancellationToken);
        return Ok(workflows);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await workflowService.GetByIdAsync(id, User.GetEmployeeId(), cancellationToken);
        return result.Succeeded ? Ok(result.Value) : BadRequest(new { error = result.Error });
    }

    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateWorkflowRequest request, CancellationToken cancellationToken)
    {
        var result = await workflowService.UpdateAsync(id, User.GetEmployeeId(), request, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : BadRequest(new { error = result.Error });
    }

    [HttpPatch("{id:guid}/enabled")]
    public async Task<IActionResult> SetEnabled(Guid id, SetWorkflowEnabledRequest request, CancellationToken cancellationToken)
    {
        var result = await workflowService.SetEnabledAsync(id, User.GetEmployeeId(), request, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : BadRequest(new { error = result.Error });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var result = await workflowService.DeleteAsync(id, User.GetEmployeeId(), cancellationToken);
        return result.Succeeded ? NoContent() : BadRequest(new { error = result.Error });
    }
}
