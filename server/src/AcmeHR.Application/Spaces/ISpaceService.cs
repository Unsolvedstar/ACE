using AcmeHR.Application.Common;

namespace AcmeHR.Application.Spaces;

public interface ISpaceService
{
    Task<Result<SpaceDto>> CreateAsync(
        Guid ownerEmployeeId, CreateSpaceRequest request, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SpaceDto>> GetMineAsync(
        Guid employeeId, CancellationToken cancellationToken = default);

    Task<Result<SpaceDto>> GetByIdAsync(
        Guid spaceId, Guid requesterId, CancellationToken cancellationToken = default);

    Task<Result<SpaceDto>> UpdateAsync(
        Guid spaceId, Guid ownerEmployeeId, UpdateSpaceRequest request, CancellationToken cancellationToken = default);

    Task<Result<SpaceDto>> AddMemberAsync(
        Guid spaceId, Guid ownerEmployeeId, AddSpaceMemberRequest request, CancellationToken cancellationToken = default);

    Task<Result<SpaceDto>> RemoveMemberAsync(
        Guid spaceId, Guid ownerEmployeeId, Guid employeeId, CancellationToken cancellationToken = default);
}
