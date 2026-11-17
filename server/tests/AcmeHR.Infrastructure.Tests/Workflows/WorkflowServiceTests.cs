using AcmeHR.Application.Workflows;
using AcmeHR.Domain.Enums;
using AcmeHR.Infrastructure.Workflows;
using Microsoft.AspNetCore.DataProtection;
using Xunit;

namespace AcmeHR.Infrastructure.Tests.Workflows;

public class WorkflowServiceTests
{
    private static WorkflowGraphSecretProtector CreateProtector() => new(new EphemeralDataProtectionProvider());

    [Fact]
    public async Task Create_StartsWithASingleManualTriggerNode()
    {
        using var dbContext = TestDbContextFactory.Create();
        var owner = dbContext.AddEmployee(EmployeeRole.LineManager);
        var service = new WorkflowService(dbContext, CreateProtector());

        var result = await service.CreateAsync(owner.Id, new CreateWorkflowRequest("Onboarding", null));

        Assert.True(result.Succeeded);
        Assert.Contains("manualTrigger", result.Value!.GraphJson);
    }

    [Fact]
    public async Task Update_ByNonOwner_Fails()
    {
        using var dbContext = TestDbContextFactory.Create();
        var owner = dbContext.AddEmployee(EmployeeRole.LineManager);
        var other = dbContext.AddEmployee(EmployeeRole.Employee);
        var service = new WorkflowService(dbContext, CreateProtector());
        var workflow = await service.CreateAsync(owner.Id, new CreateWorkflowRequest("Onboarding", null));

        var result = await service.UpdateAsync(
            workflow.Value!.Id, other.Id, new UpdateWorkflowRequest("Renamed", null, workflow.Value.GraphJson));

        Assert.False(result.Succeeded);
    }

    [Fact]
    public async Task Update_WithWebhookUrl_RoundTripsThroughEncryption()
    {
        using var dbContext = TestDbContextFactory.Create();
        var owner = dbContext.AddEmployee(EmployeeRole.LineManager);
        var service = new WorkflowService(dbContext, CreateProtector());
        var workflow = await service.CreateAsync(owner.Id, new CreateWorkflowRequest("Alert", null));

        const string graphJson = """
            {"nodes":[
                {"id":"trigger-1","type":"manualTrigger","position":{"x":0,"y":0},"data":{}},
                {"id":"webhook-1","type":"webhook","position":{"x":0,"y":100},"data":{"url":"https://example.com/hook","headers":{"X-Api-Key":"secret-value"},"payloadTemplate":"{}"}}
            ],"edges":[{"id":"e1","source":"trigger-1","target":"webhook-1"}]}
            """;

        var updateResult = await service.UpdateAsync(
            workflow.Value!.Id, owner.Id, new UpdateWorkflowRequest("Alert", null, graphJson));
        Assert.True(updateResult.Succeeded);

        // The value returned right back to the owner should be decrypted plaintext again...
        Assert.Contains("https://example.com/hook", updateResult.Value!.GraphJson);
        Assert.Contains("secret-value", updateResult.Value.GraphJson);

        // ...while what's actually persisted in the database must not contain the plaintext secret.
        var stored = dbContext.Workflows.Single(w => w.Id == workflow.Value.Id);
        Assert.DoesNotContain("secret-value", stored.GraphJson);

        var reloaded = await service.GetByIdAsync(workflow.Value.Id, owner.Id);
        Assert.True(reloaded.Succeeded);
        Assert.Contains("https://example.com/hook", reloaded.Value!.GraphJson);
        Assert.Contains("secret-value", reloaded.Value.GraphJson);
    }

    [Fact]
    public async Task SetEnabled_TogglesFlag()
    {
        using var dbContext = TestDbContextFactory.Create();
        var owner = dbContext.AddEmployee(EmployeeRole.LineManager);
        var service = new WorkflowService(dbContext, CreateProtector());
        var workflow = await service.CreateAsync(owner.Id, new CreateWorkflowRequest("Onboarding", null));

        var result = await service.SetEnabledAsync(workflow.Value!.Id, owner.Id, new SetWorkflowEnabledRequest(false));

        Assert.True(result.Succeeded);
        Assert.False(result.Value!.IsEnabled);
    }

    [Fact]
    public async Task Delete_ByOwner_Succeeds()
    {
        using var dbContext = TestDbContextFactory.Create();
        var owner = dbContext.AddEmployee(EmployeeRole.LineManager);
        var service = new WorkflowService(dbContext, CreateProtector());
        var workflow = await service.CreateAsync(owner.Id, new CreateWorkflowRequest("Onboarding", null));

        var result = await service.DeleteAsync(workflow.Value!.Id, owner.Id);

        Assert.True(result.Succeeded);
        Assert.Empty(dbContext.Workflows);
    }
}
