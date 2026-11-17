using AcmeHR.Application.Boards;
using AcmeHR.Application.Folders;
using AcmeHR.Application.Spaces;
using AcmeHR.Domain.Enums;
using AcmeHR.Infrastructure.Boards;
using AcmeHR.Infrastructure.Folders;
using AcmeHR.Infrastructure.Notifications;
using AcmeHR.Infrastructure.Spaces;
using Xunit;

namespace AcmeHR.Infrastructure.Tests.Boards;

public class BoardServiceTests
{
    [Fact]
    public async Task Create_WithFolderId_DenormalizesSpaceIdOntoBoard()
    {
        using var dbContext = TestDbContextFactory.Create();
        var owner = dbContext.AddEmployee(EmployeeRole.LineManager);
        var spaceService = new SpaceService(dbContext, new NotificationService(dbContext));
        var space = await spaceService.CreateAsync(owner.Id, new CreateSpaceRequest("Ops", null, null, []));
        var folderService = new FolderService(dbContext);
        var folder = await folderService.CreateAsync(space.Value!.Id, owner.Id, new CreateFolderRequest(space.Value.Id, "Q1"));
        var boardService = new BoardService(dbContext, new NotificationService(dbContext));

        var result = await boardService.CreateAsync(
            owner.Id, new CreateBoardRequest("Conveyor Maintenance", null, null, null, folder.Value!.Id, BoardPriority.Normal, null, []));

        Assert.True(result.Succeeded);
        Assert.Equal(folder.Value.Id, result.Value!.FolderId);
        Assert.Equal(space.Value.Id, result.Value.SpaceId);
    }

    [Fact]
    public async Task Move_ToSpaceOnly_ClearsFolder()
    {
        using var dbContext = TestDbContextFactory.Create();
        var owner = dbContext.AddEmployee(EmployeeRole.LineManager);
        var spaceService = new SpaceService(dbContext, new NotificationService(dbContext));
        var space = await spaceService.CreateAsync(owner.Id, new CreateSpaceRequest("Ops", null, null, []));
        var folderService = new FolderService(dbContext);
        var folder = await folderService.CreateAsync(space.Value!.Id, owner.Id, new CreateFolderRequest(space.Value.Id, "Q1"));
        var boardService = new BoardService(dbContext, new NotificationService(dbContext));
        var board = await boardService.CreateAsync(
            owner.Id, new CreateBoardRequest("Conveyor Maintenance", null, null, null, folder.Value!.Id, BoardPriority.Normal, null, []));

        var result = await boardService.MoveAsync(board.Value!.Id, owner.Id, new MoveBoardRequest(space.Value.Id, null));

        Assert.True(result.Succeeded);
        Assert.Equal(space.Value.Id, result.Value!.SpaceId);
        Assert.Null(result.Value.FolderId);
    }

    [Fact]
    public async Task Move_ByNonOwner_Fails()
    {
        using var dbContext = TestDbContextFactory.Create();
        var owner = dbContext.AddEmployee(EmployeeRole.LineManager);
        var member = dbContext.AddEmployee(EmployeeRole.Employee);
        var boardService = new BoardService(dbContext, new NotificationService(dbContext));
        var board = await boardService.CreateAsync(
            owner.Id, new CreateBoardRequest("Conveyor Maintenance", null, null, null, null, BoardPriority.Normal, null, [member.Id]));

        var result = await boardService.MoveAsync(board.Value!.Id, member.Id, new MoveBoardRequest(null, null));

        Assert.False(result.Succeeded);
    }

    [Fact]
    public async Task DeleteFolder_FallsBackBoardToSpaceLevel_NotUnsorted()
    {
        using var dbContext = TestDbContextFactory.Create();
        var owner = dbContext.AddEmployee(EmployeeRole.LineManager);
        var spaceService = new SpaceService(dbContext, new NotificationService(dbContext));
        var space = await spaceService.CreateAsync(owner.Id, new CreateSpaceRequest("Ops", null, null, []));
        var folderService = new FolderService(dbContext);
        var folder = await folderService.CreateAsync(space.Value!.Id, owner.Id, new CreateFolderRequest(space.Value.Id, "Q1"));
        var boardService = new BoardService(dbContext, new NotificationService(dbContext));
        var board = await boardService.CreateAsync(
            owner.Id, new CreateBoardRequest("Conveyor Maintenance", null, null, null, folder.Value!.Id, BoardPriority.Normal, null, []));

        var deleteResult = await folderService.DeleteAsync(space.Value.Id, folder.Value.Id, owner.Id);
        Assert.True(deleteResult.Succeeded);

        var reloaded = await boardService.GetByIdAsync(board.Value!.Id, owner.Id);
        Assert.True(reloaded.Succeeded);
        Assert.Null(reloaded.Value!.FolderId);
        Assert.Equal(space.Value.Id, reloaded.Value.SpaceId);
    }
}
