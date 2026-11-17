using AcmeHR.Api.Common;
using AcmeHR.Application.Spaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AcmeHR.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class SpacesController(ISpaceService spaceService) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create(CreateSpaceRequest request, CancellationToken cancellationToken)
    {
        var result = await spaceService.CreateAsync(User.GetEmployeeId(), request, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : BadRequest(new { error = result.Error });
    }

    [HttpGet("mine")]
    public async Task<IActionResult> GetMine(CancellationToken cancellationToken)
    {
        var spaces = await spaceService.GetMineAsync(User.GetEmployeeId(), cancellationToken);
        return Ok(spaces);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var result = await spaceService.GetByIdAsync(id, User.GetEmployeeId(), cancellationToken);
        return result.Succeeded ? Ok(result.Value) : BadRequest(new { error = result.Error });
    }

    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateSpaceRequest request, CancellationToken cancellationToken)
    {
        var result = await spaceService.UpdateAsync(id, User.GetEmployeeId(), request, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : BadRequest(new { error = result.Error });
    }

    [HttpPost("{id:guid}/members")]
    public async Task<IActionResult> AddMember(Guid id, AddSpaceMemberRequest request, CancellationToken cancellationToken)
    {
        var result = await spaceService.AddMemberAsync(id, User.GetEmployeeId(), request, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : BadRequest(new { error = result.Error });
    }

    [HttpDelete("{id:guid}/members/{employeeId:guid}")]
    public async Task<IActionResult> RemoveMember(Guid id, Guid employeeId, CancellationToken cancellationToken)
    {
        var result = await spaceService.RemoveMemberAsync(id, User.GetEmployeeId(), employeeId, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : BadRequest(new { error = result.Error });
    }
}
