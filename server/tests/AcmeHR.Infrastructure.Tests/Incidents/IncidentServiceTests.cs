using AcmeHR.Application.Incidents;
using AcmeHR.Domain.Enums;
using AcmeHR.Infrastructure.Incidents;
using AcmeHR.Infrastructure.Notifications;
using Xunit;

namespace AcmeHR.Infrastructure.Tests.Incidents;

public class IncidentServiceTests
{
    private static SubmitIncidentReportRequest ValidRequest(IncidentSeverity severity = IncidentSeverity.Medium) =>
        new("Conveyor jam", "Hand caught in the guard.", severity, "Shaft 3", DateTime.UtcNow.AddHours(-1));

    [Fact]
    public async Task Submit_Succeeds_AndStartsAsReported()
    {
        using var dbContext = TestDbContextFactory.Create();
        var employee = dbContext.AddEmployee(EmployeeRole.Employee);
        var service = new IncidentService(dbContext, new NotificationService(dbContext));

        var result = await service.SubmitAsync(employee.Id, ValidRequest());

        Assert.True(result.Succeeded);
        Assert.Equal(IncidentStatus.Reported, result.Value!.Status);
        Assert.Equal(employee.Id, result.Value.EmployeeId);
    }

    [Fact]
    public async Task GetMyIncidents_OnlyReturnsTheCallersOwnReports()
    {
        using var dbContext = TestDbContextFactory.Create();
        var reporter = dbContext.AddEmployee(EmployeeRole.Employee);
        var otherEmployee = dbContext.AddEmployee(EmployeeRole.Employee);
        var service = new IncidentService(dbContext, new NotificationService(dbContext));

        await service.SubmitAsync(reporter.Id, ValidRequest());
        await service.SubmitAsync(otherEmployee.Id, ValidRequest());

        var mine = await service.GetMyIncidentsAsync(reporter.Id);

        var incident = Assert.Single(mine);
        Assert.Equal(reporter.Id, incident.EmployeeId);
    }

    [Fact]
    public async Task GetAllIncidents_OrdersOpenIncidentsBeforeClosedOnes()
    {
        using var dbContext = TestDbContextFactory.Create();
        var reporter = dbContext.AddEmployee(EmployeeRole.Employee);
        var reviewer = dbContext.AddEmployee(EmployeeRole.SafetyOfficer);
        var service = new IncidentService(dbContext, new NotificationService(dbContext));

        var closedOne = await service.SubmitAsync(reporter.Id, ValidRequest());
        await service.UpdateStatusAsync(closedOne.Value!.Id, reviewer.Id, new UpdateIncidentStatusRequest(IncidentStatus.Closed, "Resolved"));
        await service.SubmitAsync(reporter.Id, ValidRequest());

        var all = await service.GetAllIncidentsAsync();

        Assert.Equal(2, all.Count);
        Assert.Equal(IncidentStatus.Reported, all[0].Status);
        Assert.Equal(IncidentStatus.Closed, all[1].Status);
    }

    [Theory]
    [InlineData(IncidentStatus.UnderInvestigation)]
    [InlineData(IncidentStatus.Closed)]
    public async Task UpdateStatus_MovingForward_Succeeds(IncidentStatus newStatus)
    {
        using var dbContext = TestDbContextFactory.Create();
        var reporter = dbContext.AddEmployee(EmployeeRole.Employee);
        var reviewer = dbContext.AddEmployee(EmployeeRole.SafetyOfficer);
        var service = new IncidentService(dbContext, new NotificationService(dbContext));
        var submitted = await service.SubmitAsync(reporter.Id, ValidRequest());

        var result = await service.UpdateStatusAsync(submitted.Value!.Id, reviewer.Id, new UpdateIncidentStatusRequest(newStatus, "Looking into it"));

        Assert.True(result.Succeeded);
        Assert.Equal(newStatus, result.Value!.Status);
        Assert.NotNull(result.Value.ReviewedAtUtc);
        Assert.Equal("Looking into it", result.Value.ReviewNotes);
    }

    [Fact]
    public async Task UpdateStatus_RepeatingCurrentStatus_Fails()
    {
        using var dbContext = TestDbContextFactory.Create();
        var reporter = dbContext.AddEmployee(EmployeeRole.Employee);
        var reviewer = dbContext.AddEmployee(EmployeeRole.SafetyOfficer);
        var service = new IncidentService(dbContext, new NotificationService(dbContext));
        var submitted = await service.SubmitAsync(reporter.Id, ValidRequest());

        var result = await service.UpdateStatusAsync(submitted.Value!.Id, reviewer.Id, new UpdateIncidentStatusRequest(IncidentStatus.Reported, null));

        Assert.False(result.Succeeded);
    }

    [Fact]
    public async Task UpdateStatus_MovingBackward_Fails()
    {
        using var dbContext = TestDbContextFactory.Create();
        var reporter = dbContext.AddEmployee(EmployeeRole.Employee);
        var reviewer = dbContext.AddEmployee(EmployeeRole.SafetyOfficer);
        var service = new IncidentService(dbContext, new NotificationService(dbContext));
        var submitted = await service.SubmitAsync(reporter.Id, ValidRequest());
        await service.UpdateStatusAsync(submitted.Value!.Id, reviewer.Id, new UpdateIncidentStatusRequest(IncidentStatus.Closed, null));

        var result = await service.UpdateStatusAsync(submitted.Value.Id, reviewer.Id, new UpdateIncidentStatusRequest(IncidentStatus.UnderInvestigation, null));

        Assert.False(result.Succeeded);
    }
}
