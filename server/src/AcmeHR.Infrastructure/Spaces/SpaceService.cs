using AcmeHR.Application.Common;
using AcmeHR.Application.Notifications;
using AcmeHR.Application.Spaces;
using AcmeHR.Domain.Entities;
using AcmeHR.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AcmeHR.Infrastructure.Spaces;

public class SpaceService(ApplicationDbContext dbContext, INotificationService notificationService) : ISpaceService
{
    public async Task<Result<SpaceDto>> CreateAsync(
        Guid ownerEmployeeId, CreateSpaceRequest request, CancellationToken cancellationToken = default)
    {
        var owner = await dbContext.Employees.FindAsync([ownerEmployeeId], cancellationToken);
        if (owner is null)
        {
            return Result<SpaceDto>.Failure("Employee profile not found.");
        }

        if (request.SiteId.HasValue)
        {
            var siteExists = await dbContext.Sites.AnyAsync(s => s.Id == request.SiteId.Value, cancellationToken);
            if (!siteExists)
            {
                return Result<SpaceDto>.Failure("The selected site could not be found.");
            }
        }

        var memberIds = request.InitialMemberEmployeeIds.Distinct().Where(id => id != ownerEmployeeId).ToList();
        if (memberIds.Count > 0)
        {
            var validCount = await dbContext.Employees.CountAsync(e => memberIds.Contains(e.Id), cancellationToken);
            if (validCount != memberIds.Count)
            {
                return Result<SpaceDto>.Failure("One or more selected members could not be found.");
            }
        }

        var space = new Space
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Description = request.Description,
            OwnerEmployeeId = ownerEmployeeId,
            SiteId = request.SiteId,
        };

        space.Members.Add(new SpaceMember { Id = Guid.NewGuid(), SpaceId = space.Id, EmployeeId = ownerEmployeeId });
        foreach (var memberId in memberIds)
        {
            space.Members.Add(new SpaceMember { Id = Guid.NewGuid(), SpaceId = space.Id, EmployeeId = memberId });
        }

        dbContext.Spaces.Add(space);
        await dbContext.SaveChangesAsync(cancellationToken);

        if (memberIds.Count > 0)
        {
            await notificationService.CreateForManyAsync(
                memberIds, $"You were added to the space \"{space.Name}\".", $"/workspace/{space.Id}", cancellationToken);
        }

        return Result<SpaceDto>.Success(await LoadDtoAsync(space.Id, cancellationToken));
    }

    public async Task<IReadOnlyList<SpaceDto>> GetMineAsync(
        Guid employeeId, CancellationToken cancellationToken = default)
    {
        var spaceIds = await dbContext.Spaces
            .Where(s => s.OwnerEmployeeId == employeeId || s.Members.Any(m => m.EmployeeId == employeeId))
            .OrderByDescending(s => s.CreatedAtUtc)
            .Select(s => s.Id)
            .ToListAsync(cancellationToken);

        var spaces = new List<SpaceDto>();
        foreach (var spaceId in spaceIds)
        {
            spaces.Add(await LoadDtoAsync(spaceId, cancellationToken));
        }

        return spaces;
    }

    public async Task<Result<SpaceDto>> GetByIdAsync(
        Guid spaceId, Guid requesterId, CancellationToken cancellationToken = default)
    {
        var access = await CheckAccessAsync(spaceId, requesterId, cancellationToken);
        if (access is null)
        {
            return Result<SpaceDto>.Failure("Space not found.");
        }

        if (!access.Value.IsOwner && !access.Value.IsMember)
        {
            return Result<SpaceDto>.Failure("You are not a member of this space.");
        }

        return Result<SpaceDto>.Success(await LoadDtoAsync(spaceId, cancellationToken));
    }

    public async Task<Result<SpaceDto>> UpdateAsync(
        Guid spaceId, Guid ownerEmployeeId, UpdateSpaceRequest request, CancellationToken cancellationToken = default)
    {
        var space = await dbContext.Spaces.FirstOrDefaultAsync(s => s.Id == spaceId, cancellationToken);
        if (space is null)
        {
            return Result<SpaceDto>.Failure("Space not found.");
        }

        if (space.OwnerEmployeeId != ownerEmployeeId)
        {
            return Result<SpaceDto>.Failure("Only the space owner can update this space.");
        }

        space.Name = request.Name;
        space.Description = request.Description;
        space.IsArchived = request.IsArchived;
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<SpaceDto>.Success(await LoadDtoAsync(spaceId, cancellationToken));
    }

    public async Task<Result<SpaceDto>> AddMemberAsync(
        Guid spaceId, Guid ownerEmployeeId, AddSpaceMemberRequest request, CancellationToken cancellationToken = default)
    {
        var space = await dbContext.Spaces.FirstOrDefaultAsync(s => s.Id == spaceId, cancellationToken);
        if (space is null)
        {
            return Result<SpaceDto>.Failure("Space not found.");
        }

        if (space.OwnerEmployeeId != ownerEmployeeId)
        {
            return Result<SpaceDto>.Failure("Only the space owner can add members.");
        }

        var employeeExists = await dbContext.Employees.AnyAsync(e => e.Id == request.EmployeeId, cancellationToken);
        if (!employeeExists)
        {
            return Result<SpaceDto>.Failure("Employee not found.");
        }

        var alreadyMember = await dbContext.SpaceMembers
            .AnyAsync(m => m.SpaceId == spaceId && m.EmployeeId == request.EmployeeId, cancellationToken);
        if (alreadyMember)
        {
            return Result<SpaceDto>.Failure("This employee is already a member of the space.");
        }

        dbContext.SpaceMembers.Add(new SpaceMember { Id = Guid.NewGuid(), SpaceId = spaceId, EmployeeId = request.EmployeeId });
        await dbContext.SaveChangesAsync(cancellationToken);

        await notificationService.CreateAsync(
            request.EmployeeId, $"You were added to the space \"{space.Name}\".", $"/workspace/{space.Id}", cancellationToken);

        return Result<SpaceDto>.Success(await LoadDtoAsync(spaceId, cancellationToken));
    }

    public async Task<Result<SpaceDto>> RemoveMemberAsync(
        Guid spaceId, Guid ownerEmployeeId, Guid employeeId, CancellationToken cancellationToken = default)
    {
        var space = await dbContext.Spaces.FirstOrDefaultAsync(s => s.Id == spaceId, cancellationToken);
        if (space is null)
        {
            return Result<SpaceDto>.Failure("Space not found.");
        }

        if (space.OwnerEmployeeId != ownerEmployeeId)
        {
            return Result<SpaceDto>.Failure("Only the space owner can remove members.");
        }

        var member = await dbContext.SpaceMembers
            .FirstOrDefaultAsync(m => m.SpaceId == spaceId && m.EmployeeId == employeeId, cancellationToken);
        if (member is null)
        {
            return Result<SpaceDto>.Failure("This employee is not a member of the space.");
        }

        dbContext.SpaceMembers.Remove(member);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<SpaceDto>.Success(await LoadDtoAsync(spaceId, cancellationToken));
    }

    internal async Task<(bool IsOwner, bool IsMember)?> CheckAccessAsync(
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

    private async Task<SpaceDto> LoadDtoAsync(Guid spaceId, CancellationToken cancellationToken)
    {
        var space = await dbContext.Spaces
            .Include(s => s.OwnerEmployee)
            .Include(s => s.Site)
            .Include(s => s.Members).ThenInclude(m => m.Employee)
            .Include(s => s.Folders)
            .Include(s => s.Boards)
            .FirstAsync(s => s.Id == spaceId, cancellationToken);

        return ToDto(space);
    }

    private static SpaceDto ToDto(Space space) => new(
        space.Id,
        space.Name,
        space.Description,
        space.OwnerEmployeeId,
        space.OwnerEmployee!.FullName,
        space.SiteId,
        space.Site?.Name,
        space.IsArchived,
        space.CreatedAtUtc,
        space.Members
            .OrderBy(m => m.Employee!.FirstName)
            .Select(m => new SpaceMemberDto(m.EmployeeId, m.Employee!.FullName, m.Employee.JobTitle, m.AddedAtUtc))
            .ToList(),
        space.Folders.Count,
        space.Boards.Count);
}
