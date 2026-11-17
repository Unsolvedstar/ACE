using AcmeHR.Api.Common;
using AcmeHR.Application.Incidents;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AcmeHR.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class IncidentsController(IIncidentService incidentService) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Submit(SubmitIncidentReportRequest request, CancellationToken cancellationToken)
    {
        var result = await incidentService.SubmitAsync(User.GetEmployeeId(), request, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : BadRequest(new { error = result.Error });
    }

    [HttpGet("mine")]
    public async Task<IActionResult> GetMine(CancellationToken cancellationToken)
    {
        var incidents = await incidentService.GetMyIncidentsAsync(User.GetEmployeeId(), cancellationToken);
        return Ok(incidents);
    }

    [Authorize(Roles = "SafetyOfficer,HR,Executive")]
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var incidents = await incidentService.GetAllIncidentsAsync(cancellationToken);
        return Ok(incidents);
    }

    [Authorize(Roles = "SafetyOfficer,HR,Executive")]
    [HttpPost("{id:guid}/review")]
    public async Task<IActionResult> UpdateStatus(Guid id, UpdateIncidentStatusRequest request, CancellationToken cancellationToken)
    {
        var result = await incidentService.UpdateStatusAsync(id, User.GetEmployeeId(), request, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : BadRequest(new { error = result.Error });
    }
}
