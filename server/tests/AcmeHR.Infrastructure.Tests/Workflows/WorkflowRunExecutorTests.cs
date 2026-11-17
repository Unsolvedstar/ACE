using System.Text.Json;
using AcmeHR.Application.Agents;
using AcmeHR.Application.Boards;
using AcmeHR.Application.Common;
using AcmeHR.Application.Notifications;
using AcmeHR.Application.Workflows;
using AcmeHR.Domain.Entities;
using AcmeHR.Domain.Enums;
using AcmeHR.Infrastructure.Agents;
using AcmeHR.Infrastructure.Boards;
using AcmeHR.Infrastructure.Notifications;
using AcmeHR.Infrastructure.Workflows;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace AcmeHR.Infrastructure.Tests.Workflows;

public class WorkflowRunExecutorTests
{
    [Fact]
    public async Task Execute_LinearTriggerToNotification_Succeeds()
    {
        using var dbContext = TestDbContextFactory.Create();
        var owner = dbContext.AddEmployee(EmployeeRole.LineManager);
        var graphJson = """
            {"nodes":[
                {"id":"trigger-1","type":"manualTrigger","position":{"x":0,"y":0},"data":{}},
                {"id":"notify-1","type":"notification","position":{"x":0,"y":100},"data":{"recipientEmployeeId":"__OWNER_ID__","message":"Hello"}}
            ],"edges":[{"id":"e1","source":"trigger-1","target":"notify-1"}]}
            """.Replace("__OWNER_ID__", owner.Id.ToString());
        var run = await SeedWorkflowAndRunAsync(dbContext, owner.Id, graphJson);

        await CreateExecutor(dbContext).ExecuteAsync(run.Id, CancellationToken.None);

        var reloaded = await ReloadRunAsync(dbContext, run.Id);
        Assert.Equal(WorkflowRunStatus.Succeeded, reloaded.Status);
        var step = Assert.Single(reloaded.Steps);
        Assert.Equal(WorkflowStepStatus.Succeeded, step.Status);
        Assert.Single(dbContext.Notifications.Where(n => n.RecipientEmployeeId == owner.Id));
    }

    [Fact]
    public async Task Execute_ConditionMatching_RoutesTrueAndSkipsFalseBranch()
    {
        using var dbContext = TestDbContextFactory.Create();
        var owner = dbContext.AddEmployee(EmployeeRole.LineManager);
        var graphJson = BuildConditionGraphJson(owner.Id, matchingValue: owner.Id.ToString());
        var run = await SeedWorkflowAndRunAsync(dbContext, owner.Id, graphJson);

        await CreateExecutor(dbContext).ExecuteAsync(run.Id, CancellationToken.None);

        var reloaded = await ReloadRunAsync(dbContext, run.Id);
        Assert.Equal(WorkflowRunStatus.Succeeded, reloaded.Status);
        Assert.Equal(WorkflowStepStatus.Succeeded, reloaded.Steps.Single(s => s.NodeId == "notify-true").Status);
        Assert.Equal(WorkflowStepStatus.Skipped, reloaded.Steps.Single(s => s.NodeId == "notify-false").Status);
    }

    [Fact]
    public async Task Execute_ConditionNotMatching_RoutesFalseAndSkipsTrueBranch()
    {
        using var dbContext = TestDbContextFactory.Create();
        var owner = dbContext.AddEmployee(EmployeeRole.LineManager);
        var graphJson = BuildConditionGraphJson(owner.Id, matchingValue: Guid.NewGuid().ToString());
        var run = await SeedWorkflowAndRunAsync(dbContext, owner.Id, graphJson);

        await CreateExecutor(dbContext).ExecuteAsync(run.Id, CancellationToken.None);

        var reloaded = await ReloadRunAsync(dbContext, run.Id);
        Assert.Equal(WorkflowRunStatus.Succeeded, reloaded.Status);
        Assert.Equal(WorkflowStepStatus.Skipped, reloaded.Steps.Single(s => s.NodeId == "notify-true").Status);
        Assert.Equal(WorkflowStepStatus.Succeeded, reloaded.Steps.Single(s => s.NodeId == "notify-false").Status);
    }

    [Fact]
    public async Task Execute_FailingNode_StopsOnlyItsOwnBranch_SiblingBranchStillSucceeds()
    {
        using var dbContext = TestDbContextFactory.Create();
        var owner = dbContext.AddEmployee(EmployeeRole.LineManager);
        var graphJson = """
            {"nodes":[
                {"id":"trigger-1","type":"manualTrigger","position":{"x":0,"y":0},"data":{}},
                {"id":"webhook-1","type":"webhook","position":{"x":-100,"y":100},"data":{"url":"https://example.invalid/hook","payloadTemplate":"{}"}},
                {"id":"notify-1","type":"notification","position":{"x":100,"y":100},"data":{"recipientEmployeeId":"__OWNER_ID__","message":"Sibling still runs"}}
            ],"edges":[
                {"id":"e1","source":"trigger-1","target":"webhook-1"},
                {"id":"e2","source":"trigger-1","target":"notify-1"}
            ]}
            """.Replace("__OWNER_ID__", owner.Id.ToString());
        var run = await SeedWorkflowAndRunAsync(dbContext, owner.Id, graphJson);

        var webhookSender = new Mock<IWebhookSender>();
        webhookSender
            .Setup(s => s.SendAsync(
                It.IsAny<string>(), It.IsAny<IReadOnlyDictionary<string, string>?>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Result<WebhookCallResult>.Failure("simulated failure"));

        await CreateExecutor(dbContext, webhookSender.Object).ExecuteAsync(run.Id, CancellationToken.None);

        var reloaded = await ReloadRunAsync(dbContext, run.Id);
        Assert.Equal(WorkflowRunStatus.Failed, reloaded.Status);
        Assert.Equal(WorkflowStepStatus.Failed, reloaded.Steps.Single(s => s.NodeId == "webhook-1").Status);
        Assert.Equal(WorkflowStepStatus.Succeeded, reloaded.Steps.Single(s => s.NodeId == "notify-1").Status);
        Assert.Single(dbContext.Notifications.Where(n => n.RecipientEmployeeId == owner.Id));
    }

    [Fact]
    public async Task Execute_GraphExceedingStepCap_FailsSafelyInsteadOfHanging()
    {
        using var dbContext = TestDbContextFactory.Create();
        var owner = dbContext.AddEmployee(EmployeeRole.LineManager);

        var nodes = new List<WorkflowNodeDto> { new("trigger-1", "manualTrigger", new(0, 0), []) };
        var edges = new List<WorkflowEdgeDto>();
        for (var i = 0; i < 600; i++)
        {
            var nodeId = $"n{i}";
            nodes.Add(new WorkflowNodeDto(nodeId, "notification", new(0, 0), new Dictionary<string, JsonElement>
            {
                ["recipientEmployeeId"] = JsonSerializer.SerializeToElement(owner.Id.ToString()),
                ["message"] = JsonSerializer.SerializeToElement("chain"),
            }));
            edges.Add(new WorkflowEdgeDto($"e{i}", i == 0 ? "trigger-1" : $"n{i - 1}", nodeId, null));
        }

        var graphJson = JsonSerializer.Serialize(new WorkflowGraphDto(nodes, edges));
        var run = await SeedWorkflowAndRunAsync(dbContext, owner.Id, graphJson);

        await CreateExecutor(dbContext).ExecuteAsync(run.Id, CancellationToken.None);

        var reloaded = await ReloadRunAsync(dbContext, run.Id);
        Assert.Equal(WorkflowRunStatus.Failed, reloaded.Status);
        Assert.Contains("maximum step count", reloaded.ErrorMessage);
    }

    [Fact]
    public async Task Execute_CodeNode_ReturnsScriptResultAsStepOutput()
    {
        using var dbContext = TestDbContextFactory.Create();
        var owner = dbContext.AddEmployee(EmployeeRole.LineManager);
        var graphJson = """
            {"nodes":[
                {"id":"trigger-1","type":"manualTrigger","position":{"x":0,"y":0},"data":{}},
                {"id":"code-1","type":"code","position":{"x":0,"y":100},"data":{"code":"return { doubled: 2 + 2 };"}}
            ],"edges":[{"id":"e1","source":"trigger-1","target":"code-1"}]}
            """;
        var run = await SeedWorkflowAndRunAsync(dbContext, owner.Id, graphJson);

        await CreateExecutor(dbContext).ExecuteAsync(run.Id, CancellationToken.None);

        var reloaded = await ReloadRunAsync(dbContext, run.Id);
        Assert.Equal(WorkflowRunStatus.Succeeded, reloaded.Status);
        var step = Assert.Single(reloaded.Steps);
        Assert.Equal(WorkflowStepStatus.Succeeded, step.Status);
        Assert.Contains("\"doubled\":4", step.OutputJson);
    }

    [Fact]
    public async Task Execute_CodeNode_CanReadTriggerData()
    {
        using var dbContext = TestDbContextFactory.Create();
        var owner = dbContext.AddEmployee(EmployeeRole.LineManager);
        var graphJson = """
            {"nodes":[
                {"id":"trigger-1","type":"manualTrigger","position":{"x":0,"y":0},"data":{}},
                {"id":"code-1","type":"code","position":{"x":0,"y":100},"data":{"code":"return trigger.triggeredByEmployeeId;"}}
            ],"edges":[{"id":"e1","source":"trigger-1","target":"code-1"}]}
            """;
        var run = await SeedWorkflowAndRunAsync(dbContext, owner.Id, graphJson);

        await CreateExecutor(dbContext).ExecuteAsync(run.Id, CancellationToken.None);

        var reloaded = await ReloadRunAsync(dbContext, run.Id);
        var step = Assert.Single(reloaded.Steps);
        Assert.Equal(WorkflowStepStatus.Succeeded, step.Status);
        Assert.Contains(owner.Id.ToString(), step.OutputJson);
    }

    [Fact]
    public async Task Execute_CodeNode_ThrowingScript_FailsOnlyThatStep()
    {
        using var dbContext = TestDbContextFactory.Create();
        var owner = dbContext.AddEmployee(EmployeeRole.LineManager);
        var graphJson = """
            {"nodes":[
                {"id":"trigger-1","type":"manualTrigger","position":{"x":0,"y":0},"data":{}},
                {"id":"code-1","type":"code","position":{"x":0,"y":100},"data":{"code":"throw new Error('boom');"}}
            ],"edges":[{"id":"e1","source":"trigger-1","target":"code-1"}]}
            """;
        var run = await SeedWorkflowAndRunAsync(dbContext, owner.Id, graphJson);

        await CreateExecutor(dbContext).ExecuteAsync(run.Id, CancellationToken.None);

        var reloaded = await ReloadRunAsync(dbContext, run.Id);
        Assert.Equal(WorkflowRunStatus.Failed, reloaded.Status);
        var step = Assert.Single(reloaded.Steps);
        Assert.Equal(WorkflowStepStatus.Failed, step.Status);
        Assert.Contains("boom", step.ErrorMessage);
    }

    [Fact]
    public async Task Execute_CodeNode_InfiniteLoop_TimesOutInsteadOfHanging()
    {
        using var dbContext = TestDbContextFactory.Create();
        var owner = dbContext.AddEmployee(EmployeeRole.LineManager);
        var graphJson = """
            {"nodes":[
                {"id":"trigger-1","type":"manualTrigger","position":{"x":0,"y":0},"data":{}},
                {"id":"code-1","type":"code","position":{"x":0,"y":100},"data":{"code":"while (true) {}"}}
            ],"edges":[{"id":"e1","source":"trigger-1","target":"code-1"}]}
            """;
        var run = await SeedWorkflowAndRunAsync(dbContext, owner.Id, graphJson);

        await CreateExecutor(dbContext).ExecuteAsync(run.Id, CancellationToken.None);

        var reloaded = await ReloadRunAsync(dbContext, run.Id);
        Assert.Equal(WorkflowRunStatus.Failed, reloaded.Status);
        var step = Assert.Single(reloaded.Steps);
        Assert.Equal(WorkflowStepStatus.Failed, step.Status);
    }

    [Fact]
    public async Task Execute_AiAgentNode_ProposedToolCall_ExecutesImmediately_ActuallyCreatesTask()
    {
        using var dbContext = TestDbContextFactory.Create();
        var owner = dbContext.AddEmployee(EmployeeRole.LineManager);
        var board = new Board { Id = Guid.NewGuid(), Name = "Ops Board", OwnerEmployeeId = owner.Id };
        board.Members.Add(new BoardMember { Id = Guid.NewGuid(), BoardId = board.Id, EmployeeId = owner.Id });
        dbContext.Boards.Add(board);
        var graphJson = """
            {"nodes":[
                {"id":"trigger-1","type":"manualTrigger","position":{"x":0,"y":0},"data":{}},
                {"id":"agent-1","type":"aiAgent","position":{"x":0,"y":100},"data":{"boardId":"__BOARD_ID__","instruction":"Create a task called Inspect scaffolding"}}
            ],"edges":[{"id":"e1","source":"trigger-1","target":"agent-1"}]}
            """.Replace("__BOARD_ID__", board.Id.ToString());
        var run = await SeedWorkflowAndRunAsync(dbContext, owner.Id, graphJson);

        var aiProvider = new Mock<IAiProvider>();
        aiProvider
            .Setup(p => p.GetChatResponseAsync(It.IsAny<AiChatRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AiChatResponse("On it.", [
                new AiToolCall(nameof(AgentToolName.CreateTask), """{"Title":"Inspect scaffolding"}"""),
            ]));

        await CreateExecutor(dbContext, aiProvider: aiProvider.Object).ExecuteAsync(run.Id, CancellationToken.None);

        var reloaded = await ReloadRunAsync(dbContext, run.Id);
        Assert.Equal(WorkflowRunStatus.Succeeded, reloaded.Status);
        Assert.Equal(WorkflowStepStatus.Succeeded, Assert.Single(reloaded.Steps).Status);
        Assert.Single(dbContext.BoardTasks.Where(t => t.BoardId == board.Id && t.Title == "Inspect scaffolding"));
    }

    [Fact]
    public async Task Execute_AiAgentNode_NoToolCallProposed_SucceedsWithNoAction()
    {
        using var dbContext = TestDbContextFactory.Create();
        var owner = dbContext.AddEmployee(EmployeeRole.LineManager);
        var board = new Board { Id = Guid.NewGuid(), Name = "Ops Board", OwnerEmployeeId = owner.Id };
        board.Members.Add(new BoardMember { Id = Guid.NewGuid(), BoardId = board.Id, EmployeeId = owner.Id });
        dbContext.Boards.Add(board);
        var graphJson = """
            {"nodes":[
                {"id":"trigger-1","type":"manualTrigger","position":{"x":0,"y":0},"data":{}},
                {"id":"agent-1","type":"aiAgent","position":{"x":0,"y":100},"data":{"boardId":"__BOARD_ID__","instruction":"How many tasks are open?"}}
            ],"edges":[{"id":"e1","source":"trigger-1","target":"agent-1"}]}
            """.Replace("__BOARD_ID__", board.Id.ToString());
        var run = await SeedWorkflowAndRunAsync(dbContext, owner.Id, graphJson);

        var aiProvider = new Mock<IAiProvider>();
        aiProvider
            .Setup(p => p.GetChatResponseAsync(It.IsAny<AiChatRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AiChatResponse("Nothing is open.", []));

        await CreateExecutor(dbContext, aiProvider: aiProvider.Object).ExecuteAsync(run.Id, CancellationToken.None);

        var reloaded = await ReloadRunAsync(dbContext, run.Id);
        Assert.Equal(WorkflowRunStatus.Succeeded, reloaded.Status);
        Assert.Empty(dbContext.BoardTasks.Where(t => t.BoardId == board.Id));
    }

    private static string BuildConditionGraphJson(Guid ownerId, string matchingValue) => """
        {"nodes":[
            {"id":"trigger-1","type":"manualTrigger","position":{"x":0,"y":0},"data":{}},
            {"id":"cond-1","type":"condition","position":{"x":0,"y":100},"data":{"field":"trigger.triggeredByEmployeeId","operator":"equals","value":"__MATCHING_VALUE__"}},
            {"id":"notify-true","type":"notification","position":{"x":-100,"y":200},"data":{"recipientEmployeeId":"__OWNER_ID__","message":"True branch"}},
            {"id":"notify-false","type":"notification","position":{"x":100,"y":200},"data":{"recipientEmployeeId":"__OWNER_ID__","message":"False branch"}}
        ],"edges":[
            {"id":"e1","source":"trigger-1","target":"cond-1"},
            {"id":"e2","source":"cond-1","target":"notify-true","sourceHandle":"true"},
            {"id":"e3","source":"cond-1","target":"notify-false","sourceHandle":"false"}
        ]}
        """.Replace("__MATCHING_VALUE__", matchingValue).Replace("__OWNER_ID__", ownerId.ToString());

    private static async Task<WorkflowRun> SeedWorkflowAndRunAsync(
        AcmeHR.Infrastructure.Persistence.ApplicationDbContext dbContext, Guid ownerId, string graphJson)
    {
        var workflow = new Workflow
        {
            Id = Guid.NewGuid(),
            Name = "Test Workflow",
            OwnerEmployeeId = ownerId,
            GraphJson = graphJson,
        };
        dbContext.Workflows.Add(workflow);

        var run = new WorkflowRun
        {
            Id = Guid.NewGuid(),
            WorkflowId = workflow.Id,
            TriggeredByEmployeeId = ownerId,
            Status = WorkflowRunStatus.Queued,
        };
        dbContext.WorkflowRuns.Add(run);

        await dbContext.SaveChangesAsync();
        return run;
    }

    private static async Task<WorkflowRun> ReloadRunAsync(
        AcmeHR.Infrastructure.Persistence.ApplicationDbContext dbContext, Guid runId) =>
        await dbContext.WorkflowRuns.Include(r => r.Steps).FirstAsync(r => r.Id == runId);

    private static WorkflowRunExecutor CreateExecutor(
        AcmeHR.Infrastructure.Persistence.ApplicationDbContext dbContext,
        IWebhookSender? webhookSender = null,
        IAiProvider? aiProvider = null)
    {
        var notifier = new Mock<IWorkflowRunNotifier>();
        notifier
            .Setup(n => n.NotifyRunUpdatedAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        notifier
            .Setup(n => n.NotifyStepUpdatedAsync(
                It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var notificationService = new NotificationService(dbContext);
        var boardTaskService = new BoardTaskService(dbContext, notificationService);
        var toolDispatcher = new AgentToolDispatcher(boardTaskService, dbContext);
        var boardContextBuilder = new BoardContextBuilder(dbContext);

        return new WorkflowRunExecutor(
            dbContext,
            new WorkflowGraphSecretProtector(new EphemeralDataProtectionProvider()),
            notificationService,
            boardTaskService,
            webhookSender ?? Mock.Of<IWebhookSender>(),
            aiProvider ?? Mock.Of<IAiProvider>(),
            toolDispatcher,
            boardContextBuilder,
            notifier.Object,
            Mock.Of<Microsoft.Extensions.Logging.ILogger<WorkflowRunExecutor>>());
    }
}
