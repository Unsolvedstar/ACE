namespace AcmeHR.Application.Spaces;

public record CreateSpaceRequest(
    string Name,
    string? Description,
    Guid? SiteId,
    List<Guid> InitialMemberEmployeeIds);

public record UpdateSpaceRequest(
    string Name,
    string? Description,
    bool IsArchived);

public record AddSpaceMemberRequest(Guid EmployeeId);

public record SpaceMemberDto(Guid EmployeeId, string EmployeeName, string JobTitle, DateTime AddedAtUtc);

public record SpaceDto(
    Guid Id,
    string Name,
    string? Description,
    Guid OwnerEmployeeId,
    string OwnerEmployeeName,
    Guid? SiteId,
    string? SiteName,
    bool IsArchived,
    DateTime CreatedAtUtc,
    IReadOnlyList<SpaceMemberDto> Members,
    int FolderCount,
    int BoardCount);
