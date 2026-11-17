using AcmeHR.Api.Common;
using AcmeHR.Application.Folders;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AcmeHR.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/spaces/{spaceId:guid}/folders")]
public class FoldersController(IFolderService folderService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetForSpace(Guid spaceId, CancellationToken cancellationToken)
    {
        var result = await folderService.GetForSpaceAsync(spaceId, User.GetEmployeeId(), cancellationToken);
        return result.Succeeded ? Ok(result.Value) : BadRequest(new { error = result.Error });
    }

    [HttpPost]
    public async Task<IActionResult> Create(Guid spaceId, CreateFolderRequest request, CancellationToken cancellationToken)
    {
        var result = await folderService.CreateAsync(spaceId, User.GetEmployeeId(), request, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : BadRequest(new { error = result.Error });
    }

    [HttpPatch("{folderId:guid}")]
    public async Task<IActionResult> Update(Guid spaceId, Guid folderId, UpdateFolderRequest request, CancellationToken cancellationToken)
    {
        var result = await folderService.UpdateAsync(spaceId, folderId, User.GetEmployeeId(), request, cancellationToken);
        return result.Succeeded ? Ok(result.Value) : BadRequest(new { error = result.Error });
    }

    [HttpDelete("{folderId:guid}")]
    public async Task<IActionResult> Delete(Guid spaceId, Guid folderId, CancellationToken cancellationToken)
    {
        var result = await folderService.DeleteAsync(spaceId, folderId, User.GetEmployeeId(), cancellationToken);
        return result.Succeeded ? Ok() : BadRequest(new { error = result.Error });
    }
}
