using AcmeHR.Application.Common;

namespace AcmeHR.Application.Folders;

public interface IFolderService
{
    Task<Result<IReadOnlyList<FolderDto>>> GetForSpaceAsync(
        Guid spaceId, Guid requesterId, CancellationToken cancellationToken = default);

    Task<Result<FolderDto>> CreateAsync(
        Guid spaceId, Guid requesterId, CreateFolderRequest request, CancellationToken cancellationToken = default);

    Task<Result<FolderDto>> UpdateAsync(
        Guid spaceId, Guid folderId, Guid requesterId, UpdateFolderRequest request, CancellationToken cancellationToken = default);

    Task<Result<bool>> DeleteAsync(
        Guid spaceId, Guid folderId, Guid requesterId, CancellationToken cancellationToken = default);
}
