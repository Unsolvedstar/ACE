using AcmeHR.Application.Agents;
using AcmeHR.Infrastructure.Agents;
using Xunit;

namespace AcmeHR.Infrastructure.Tests.Agents;

public class RuleBasedAiProviderTests
{
    private static readonly Guid JaneId = Guid.NewGuid();
    private static readonly Guid JohnId = Guid.NewGuid();
    private static readonly Guid TaskId = Guid.NewGuid();

    private static AiBoardContext CreateBoardContext(DateOnly? taskDueDate = null, string taskStatus = "Todo")
    {
        var members = new List<AiBoardMemberContext>
        {
            new(JaneId, "Jane Doe", "Site Supervisor"),
            new(JohnId, "John Smith", "Technician"),
        };
        var tasks = new List<AiBoardTaskContext>
        {
            new(TaskId, "Fix conveyor sensor", null, JaneId, "Jane Doe", taskStatus, taskDueDate, DateTime.UtcNow, null),
        };
        return new AiBoardContext(Guid.NewGuid(), "Site Safety Board", members, tasks);
    }

    [Fact]
    public async Task GetChatResponseAsync_OverdueKeyword_ListsOverdueTasks()
    {
        var board = CreateBoardContext(DateOnly.FromDateTime(DateTime.UtcNow).AddDays(-3));
        var provider = new RuleBasedAiProvider();

        var response = await provider.GetChatResponseAsync(
            new AiChatRequest(board, [], "What's overdue?", ToolsEnabled: false));

        Assert.Contains("Fix conveyor sensor", response.ReplyText);
        Assert.Contains("Jane Doe", response.ReplyText);
        Assert.Empty(response.ProposedToolCalls);
    }

    [Fact]
    public async Task GetChatResponseAsync_NoOverdueTasks_SaysSo()
    {
        var board = CreateBoardContext(DateOnly.FromDateTime(DateTime.UtcNow).AddDays(3));
        var provider = new RuleBasedAiProvider();

        var response = await provider.GetChatResponseAsync(
            new AiChatRequest(board, [], "anything overdue?", ToolsEnabled: false));

        Assert.Contains("Nothing is overdue", response.ReplyText);
    }

    [Fact]
    public async Task GetChatResponseAsync_WorkloadKeyword_GroupsOpenTasksByMember()
    {
        var board = CreateBoardContext();
        var provider = new RuleBasedAiProvider();

        var response = await provider.GetChatResponseAsync(
            new AiChatRequest(board, [], "Show workload", ToolsEnabled: false));

        Assert.Contains("Jane Doe: 1 open", response.ReplyText);
        Assert.Contains("John Smith: 0 open", response.ReplyText);
    }

    [Fact]
    public async Task GetChatResponseAsync_ToolsDisabled_NeverProposesActionsEvenForStructuredPhrasing()
    {
        var board = CreateBoardContext();
        var provider = new RuleBasedAiProvider();

        var response = await provider.GetChatResponseAsync(
            new AiChatRequest(board, [], "create task \"Inspect belt\" for Jane Doe by tomorrow", ToolsEnabled: false));

        Assert.Empty(response.ProposedToolCalls);
    }

    [Fact]
    public async Task GetChatResponseAsync_CreateTaskPhrasing_ProposesCreateTaskWithResolvedAssigneeAndDate()
    {
        var board = CreateBoardContext();
        var provider = new RuleBasedAiProvider();
        var tomorrow = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(1);

        var response = await provider.GetChatResponseAsync(new AiChatRequest(
            board, [], "create task \"Inspect belt\" for Jane Doe by tomorrow", ToolsEnabled: true));

        var call = Assert.Single(response.ProposedToolCalls);
        Assert.Equal("CreateTask", call.ToolName);
        Assert.Contains("Inspect belt", call.ArgumentsJson);
        Assert.Contains(JaneId.ToString(), call.ArgumentsJson);
        Assert.Contains(tomorrow.ToString("yyyy-MM-dd"), call.ArgumentsJson);
    }

    [Fact]
    public async Task GetChatResponseAsync_MarkDonePhrasing_ProposesUpdateTaskStatusForMatchedTask()
    {
        var board = CreateBoardContext();
        var provider = new RuleBasedAiProvider();

        var response = await provider.GetChatResponseAsync(new AiChatRequest(
            board, [], "mark \"Fix conveyor sensor\" done", ToolsEnabled: true));

        var call = Assert.Single(response.ProposedToolCalls);
        Assert.Equal("UpdateTaskStatus", call.ToolName);
        Assert.Contains(TaskId.ToString(), call.ArgumentsJson);
    }

    [Fact]
    public async Task GetChatResponseAsync_AssignPhrasing_ProposesAssignTaskForResolvedTaskAndMember()
    {
        var board = CreateBoardContext();
        var provider = new RuleBasedAiProvider();

        var response = await provider.GetChatResponseAsync(new AiChatRequest(
            board, [], "assign \"Fix conveyor sensor\" to John Smith", ToolsEnabled: true));

        var call = Assert.Single(response.ProposedToolCalls);
        Assert.Equal("AssignTask", call.ToolName);
        Assert.Contains(TaskId.ToString(), call.ArgumentsJson);
        Assert.Contains(JohnId.ToString(), call.ArgumentsJson);
    }

    [Fact]
    public async Task GetChatResponseAsync_UnrecognizedTaskInAssignPhrasing_FallsThroughWithoutProposingAnything()
    {
        var board = CreateBoardContext();
        var provider = new RuleBasedAiProvider();

        var response = await provider.GetChatResponseAsync(new AiChatRequest(
            board, [], "assign \"Some task that does not exist\" to John Smith", ToolsEnabled: true));

        Assert.Empty(response.ProposedToolCalls);
    }

    [Fact]
    public async Task GetChatResponseAsync_AmbiguousMessageWithToolsEnabled_FallsThroughToReadOnlyReply()
    {
        var board = CreateBoardContext();
        var provider = new RuleBasedAiProvider();

        var response = await provider.GetChatResponseAsync(new AiChatRequest(
            board, [], "how's it going?", ToolsEnabled: true));

        Assert.Empty(response.ProposedToolCalls);
        Assert.Contains(board.BoardName, response.ReplyText);
    }

    [Fact]
    public async Task SummarizeAsync_ProducesGroundedStandupText()
    {
        var board = CreateBoardContext();
        var provider = new RuleBasedAiProvider();

        var summary = await provider.SummarizeAsync(new AiSummaryRequest(board, null));

        Assert.Contains(board.BoardName, summary);
        Assert.Contains("Jane Doe", summary);
    }
}
