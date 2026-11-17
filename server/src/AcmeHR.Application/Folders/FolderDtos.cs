namespace AcmeHR.Application.Folders;

public record CreateFolderRequest(Guid SpaceId, string Name);

public record UpdateFolderRequest(string Name, bool IsArchived);

public record FolderDto(
    Guid Id,
    Guid SpaceId,
    string Name,
    bool IsArchived,
    DateTime CreatedAtUtc,
    int BoardCount);
