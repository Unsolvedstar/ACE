using AcmeHR.Api.Common;
using AcmeHR.Application.Acknowledgments;
using AcmeHR.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AcmeHR.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class AcknowledgmentsController(IAcknowledgmentService acknowledgmentService) : ControllerBase
{
    [Authorize(Roles = "HR,Executive")]
    [HttpPost("{entityType:int}/{entityId:guid}")]
    public async Task<IActionResult> Acknowledge(AcknowledgmentEntityType entityType, Guid entityId, CancellationToken cancellationToken)
    {
        var result = await acknowledgmentService.AcknowledgeAsync(entityType, entityId, User.GetEmployeeId(), cancellationToken);
        return result.Succeeded ? Ok(result.Value) : BadRequest(new { error = result.Error });
    }

    [HttpGet("{entityType:int}/{entityId:guid}")]
    public async Task<IActionResult> GetForEntity(AcknowledgmentEntityType entityType, Guid entityId, CancellationToken cancellationToken)
    {
        var result = await acknowledgmentService.GetForEntityAsync(entityType, entityId, User.GetEmployeeId(), cancellationToken);
        return result.Succeeded ? Ok(result.Value) : BadRequest(new { error = result.Error });
    }
}
