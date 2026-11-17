using AcmeHR.Application.Folders;
using AcmeHR.Application.Spaces;
using AcmeHR.Domain.Enums;
using AcmeHR.Infrastructure.Folders;
using AcmeHR.Infrastructure.Notifications;
using AcmeHR.Infrastructure.Spaces;
using Xunit;

namespace AcmeHR.Infrastructure.Tests.Folders;

public class FolderServiceTests
{
    [Fact]
    public async Task Create_ByNonMember_Fails()
    {
        using var dbContext = TestDbContextFactory.Create();
        var owner = dbContext.AddEmployee(EmployeeRole.LineManager);
        var stranger = dbContext.AddEmployee(EmployeeRole.Employee);
        var spaceService = new SpaceService(dbContext, new NotificationService(dbContext));
        var space = await spaceService.CreateAsync(owner.Id, new CreateSpaceRequest("Ops", null, null, []));
        var folderService = new FolderService(dbContext);

        var result = await folderService.CreateAsync(
            space.Value!.Id, stranger.Id, new CreateFolderRequest(space.Value.Id, "Q1 Projects"));

        Assert.False(result.Succeeded);
    }

    [Fact]
    public async Task Create_ByMember_Succeeds()
    {
        using var dbContext = TestDbContextFactory.Create();
        var owner = dbContext.AddEmployee(EmployeeRole.LineManager);
        var spaceService = new SpaceService(dbContext, new NotificationService(dbContext));
        var space = await spaceService.CreateAsync(owner.Id, new CreateSpaceRequest("Ops", null, null, []));
        var folderService = new FolderService(dbContext);

        var result = await folderService.CreateAsync(
            space.Value!.Id, owner.Id, new CreateFolderRequest(space.Value.Id, "Q1 Projects"));

        Assert.True(result.Succeeded);
        Assert.Equal("Q1 Projects", result.Value!.Name);
    }

    [Fact]
    public async Task Delete_ByNonOwnerMember_Fails()
    {
        using var dbContext = TestDbContextFactory.Create();
        var owner = dbContext.AddEmployee(EmployeeRole.LineManager);
        var member = dbContext.AddEmployee(EmployeeRole.Employee);
        var spaceService = new SpaceService(dbContext, new NotificationService(dbContext));
        var space = await spaceService.CreateAsync(owner.Id, new CreateSpaceRequest("Ops", null, null, [member.Id]));
        var folderService = new FolderService(dbContext);
        var folder = await folderService.CreateAsync(space.Value!.Id, owner.Id, new CreateFolderRequest(space.Value.Id, "Q1 Projects"));

        var result = await folderService.DeleteAsync(space.Value.Id, folder.Value!.Id, member.Id);

        Assert.False(result.Succeeded);
    }
}
