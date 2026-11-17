using AcmeHR.Application.Common;
using AcmeHR.Application.Folders;
using AcmeHR.Domain.Entities;
using AcmeHR.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AcmeHR.Infrastructure.Folders;

public class FolderService(ApplicationDbContext dbContext) : IFolderService
{
    public async Task<Result<IReadOnlyList<FolderDto>>> GetForSpaceAsync(
        Guid spaceId, Guid requesterId, CancellationToken cancellationToken = default)
    {
        var access = await CheckAccessAsync(spaceId, requesterId, cancellationToken);
        if (access is null)
        {
            return Result<IReadOnlyList<FolderDto>>.Failure("Space not found.");
        }

        if (!access.Value.IsOwner && !access.Value.IsMember)
        {
            return Result<IReadOnlyList<FolderDto>>.Failure("You are not a member of this space.");
        }

        var folders = await dbContext.Folders
            .Include(f => f.Boards)
            .Where(f => f.SpaceId == spaceId)
            .OrderBy(f => f.Name)
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<FolderDto>>.Success(
            folders.Select(f => ToDto(f, f.Boards.Count)).ToList());
    }

    public async Task<Result<FolderDto>> CreateAsync(
        Guid spaceId, Guid requesterId, CreateFolderRequest request, CancellationToken cancellationToken = default)
    {
        if (request.SpaceId != spaceId)
        {
            return Result<FolderDto>.Failure("Space mismatch.");
        }

        var access = await CheckAccessAsync(spaceId, requesterId, cancellationToken);
        if (access is null)
        {
            return Result<FolderDto>.Failure("Space not found.");
        }

        if (!access.Value.IsOwner && !access.Value.IsMember)
        {
            return Result<FolderDto>.Failure("You are not a member of this space.");
        }

        var folder = new Folder
        {
            Id = Guid.NewGuid(),
            SpaceId = spaceId,
            Name = request.Name,
        };

        dbContext.Folders.Add(folder);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<FolderDto>.Success(ToDto(folder, 0));
    }

    public async Task<Result<FolderDto>> UpdateAsync(
        Guid spaceId, Guid folderId, Guid requesterId, UpdateFolderRequest request, CancellationToken cancellationToken = default)
    {
        var access = await CheckAccessAsync(spaceId, requesterId, cancellationToken);
        if (access is null)
        {
            return Result<FolderDto>.Failure("Space not found.");
        }

        if (!access.Value.IsOwner && !access.Value.IsMember)
        {
            return Result<FolderDto>.Failure("You are not a member of this space.");
        }

        var folder = await dbContext.Folders
            .Include(f => f.Boards)
            .FirstOrDefaultAsync(f => f.Id == folderId && f.SpaceId == spaceId, cancellationToken);
        if (folder is null)
        {
            return Result<FolderDto>.Failure("Folder not found.");
        }

        folder.Name = request.Name;
        folder.IsArchived = request.IsArchived;
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<FolderDto>.Success(ToDto(folder, folder.Boards.Count));
    }

    public async Task<Result<bool>> DeleteAsync(
        Guid spaceId, Guid folderId, Guid requesterId, CancellationToken cancellationToken = default)
    {
        var access = await CheckAccessAsync(spaceId, requesterId, cancellationToken);
        if (access is null)
        {
            return Result<bool>.Failure("Space not found.");
        }

        if (!access.Value.IsOwner)
        {
            return Result<bool>.Failure("Only the space owner can delete folders.");
        }

        var folder = await dbContext.Folders.FirstOrDefaultAsync(f => f.Id == folderId && f.SpaceId == spaceId, cancellationToken);
        if (folder is null)
        {
            return Result<bool>.Failure("Folder not found.");
        }

        // Boards under this folder fall back to the parent Space (Board.SpaceId is already set),
        // not orphaned — see BoardConfiguration's SetNull on Board.FolderId.
        dbContext.Folders.Remove(folder);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(true);
    }

    private async Task<(bool IsOwner, bool IsMember)?> CheckAccessAsync(
        Guid spaceId, Guid requesterId, CancellationToken cancellationToken)
    {
        var space = await dbContext.Spaces.FirstOrDefaultAsync(s => s.Id == spaceId, cancellationToken);
        if (space is null)
        {
            return null;
        }

        var isOwner = space.OwnerEmployeeId == requesterId;
        var isMember = isOwner || await dbContext.SpaceMembers
            .AnyAsync(m => m.SpaceId == spaceId && m.EmployeeId == requesterId, cancellationToken);

        return (isOwner, isMember);
    }

    private static FolderDto ToDto(Folder folder, int boardCount) => new(
        folder.Id,
        folder.SpaceId,
        folder.Name,
        folder.IsArchived,
        folder.CreatedAtUtc,
        boardCount);
}
