using AcmeHR.Application.Spaces;
using AcmeHR.Domain.Enums;
using AcmeHR.Infrastructure.Notifications;
using AcmeHR.Infrastructure.Spaces;
using Xunit;

namespace AcmeHR.Infrastructure.Tests.Spaces;

public class SpaceServiceTests
{
    [Fact]
    public async Task Create_SeedsOwnerAsMember()
    {
        using var dbContext = TestDbContextFactory.Create();
        var owner = dbContext.AddEmployee(EmployeeRole.LineManager);
        var service = new SpaceService(dbContext, new NotificationService(dbContext));

        var result = await service.CreateAsync(owner.Id, new CreateSpaceRequest("Ops", null, null, []));

        Assert.True(result.Succeeded);
        Assert.Single(result.Value!.Members);
        Assert.Equal(owner.Id, result.Value.Members[0].EmployeeId);
    }

    [Fact]
    public async Task GetById_ByNonMember_Fails()
    {
        using var dbContext = TestDbContextFactory.Create();
        var owner = dbContext.AddEmployee(EmployeeRole.LineManager);
        var stranger = dbContext.AddEmployee(EmployeeRole.Employee);
        var service = new SpaceService(dbContext, new NotificationService(dbContext));
        var created = await service.CreateAsync(owner.Id, new CreateSpaceRequest("Ops", null, null, []));

        var result = await service.GetByIdAsync(created.Value!.Id, stranger.Id);

        Assert.False(result.Succeeded);
    }

    [Fact]
    public async Task Update_ByNonOwnerMember_Fails()
    {
        using var dbContext = TestDbContextFactory.Create();
        var owner = dbContext.AddEmployee(EmployeeRole.LineManager);
        var member = dbContext.AddEmployee(EmployeeRole.Employee);
        var service = new SpaceService(dbContext, new NotificationService(dbContext));
        var created = await service.CreateAsync(owner.Id, new CreateSpaceRequest("Ops", null, null, [member.Id]));

        var result = await service.UpdateAsync(created.Value!.Id, member.Id, new UpdateSpaceRequest("Renamed", null, false));

        Assert.False(result.Succeeded);
    }

    [Fact]
    public async Task AddMember_ByOwner_Succeeds()
    {
        using var dbContext = TestDbContextFactory.Create();
        var owner = dbContext.AddEmployee(EmployeeRole.LineManager);
        var newMember = dbContext.AddEmployee(EmployeeRole.Employee);
        var service = new SpaceService(dbContext, new NotificationService(dbContext));
        var created = await service.CreateAsync(owner.Id, new CreateSpaceRequest("Ops", null, null, []));

        var result = await service.AddMemberAsync(created.Value!.Id, owner.Id, new AddSpaceMemberRequest(newMember.Id));

        Assert.True(result.Succeeded);
        Assert.Equal(2, result.Value!.Members.Count);
    }
}
