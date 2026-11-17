using AcmeHR.Domain.Entities;
using AcmeHR.Domain.Enums;
using AcmeHR.Infrastructure.Persistence;
using AcmeHR.Infrastructure.Reports;
using Xunit;

namespace AcmeHR.Infrastructure.Tests.Reports;

public class ReportsServiceTests
{
    private static ReportsService CreateService(ApplicationDbContext dbContext) => new(dbContext);

    private static Site AddSite(ApplicationDbContext dbContext, string name)
    {
        var site = new Site { Id = Guid.NewGuid(), Name = name, Location = name };
        dbContext.Sites.Add(site);
        dbContext.SaveChanges();
        return site;
    }

    private static Employee AddEmployeeAtSite(ApplicationDbContext dbContext, Guid siteId)
    {
        var employee = new Employee
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(),
            EmployeeNumber = $"EMP-{Guid.NewGuid():N}"[..12],
            FirstName = "Test",
            LastName = "Employee",
            JobTitle = "Miner",
            Role = EmployeeRole.Employee,
            SiteId = siteId,
        };
        dbContext.Employees.Add(employee);
        dbContext.SaveChanges();
        return employee;
    }

    private static IncidentReport AddIncident(ApplicationDbContext dbContext, Guid employeeId, DateTime occurredAtUtc, IncidentSeverity severity = IncidentSeverity.Low)
    {
        var incident = new IncidentReport
        {
            Id = Guid.NewGuid(),
            EmployeeId = employeeId,
            Title = "Incident",
            Description = "...",
            Severity = severity,
            Location = "Shaft 1",
            OccurredAtUtc = occurredAtUtc,
        };
        dbContext.IncidentReports.Add(incident);
        dbContext.SaveChanges();
        return incident;
    }

    [Fact]
    public async Task GetSiteSafetyRisk_NoSites_ReturnsEmptyList()
    {
        using var dbContext = TestDbContextFactory.Create();
        var service = CreateService(dbContext);

        var result = await service.GetSiteSafetyRiskAsync();

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetSiteSafetyRisk_SiteWithNoSignals_ScoresLowWithFallbackContributor()
    {
        using var dbContext = TestDbContextFactory.Create();
        var site = AddSite(dbContext, "Quiet Site");
        AddEmployeeAtSite(dbContext, site.Id);
        var service = CreateService(dbContext);

        var result = await service.GetSiteSafetyRiskAsync();

        var entry = Assert.Single(result);
        Assert.Equal(0, entry.Score);
        Assert.Equal(SafetyRiskBand.Low, entry.Band);
        Assert.Equal(SafetyRiskTrend.Stable, entry.Trend);
        Assert.Contains(entry.Contributors, c => c.Contains("No elevated"));
    }

    [Fact]
    public async Task GetSiteSafetyRisk_SiteWithMoreIncidents_RanksAboveQuieterSite()
    {
        using var dbContext = TestDbContextFactory.Create();
        var busySite = AddSite(dbContext, "Busy Site");
        var quietSite = AddSite(dbContext, "Quiet Site");
        var busyEmployee = AddEmployeeAtSite(dbContext, busySite.Id);
        AddEmployeeAtSite(dbContext, quietSite.Id);

        for (var i = 0; i < 5; i++)
        {
            AddIncident(dbContext, busyEmployee.Id, DateTime.UtcNow.AddDays(-i), IncidentSeverity.High);
        }

        var service = CreateService(dbContext);
        var result = await service.GetSiteSafetyRiskAsync();

        Assert.Equal(busySite.Id, result[0].SiteId);
        Assert.True(result[0].Score > result[1].Score);
    }

    [Fact]
    public async Task GetSiteSafetyRisk_CriticalIncident_FloorsBandAtElevatedEvenWithLowScore()
    {
        using var dbContext = TestDbContextFactory.Create();
        var site = AddSite(dbContext, "Site A");
        var employee = AddEmployeeAtSite(dbContext, site.Id);
        // A single critical incident, otherwise nothing else elevating the raw score (it's the
        // only site, so its rate always equals the "org average" and would score 0 unadjusted).
        AddIncident(dbContext, employee.Id, DateTime.UtcNow.AddDays(-1), IncidentSeverity.Critical);

        var service = CreateService(dbContext);
        var result = await service.GetSiteSafetyRiskAsync();

        var entry = Assert.Single(result);
        Assert.True(entry.Band >= SafetyRiskBand.Elevated);
        Assert.Contains(entry.Contributors, c => c.Contains("Critical-severity"));
    }

    [Fact]
    public async Task GetSiteSafetyRisk_RisingIncidentTrend_ScoresHigherThanFallingTrendAtSameCurrentCount()
    {
        using var dbContext = TestDbContextFactory.Create();
        var risingSite = AddSite(dbContext, "Rising Site");
        var fallingSite = AddSite(dbContext, "Falling Site");
        var risingEmployee = AddEmployeeAtSite(dbContext, risingSite.Id);
        var fallingEmployee = AddEmployeeAtSite(dbContext, fallingSite.Id);

        // Both sites have 3 incidents in the last 30 days, but rising had 0 in the 30 days
        // before that while falling had 10 — same current count, opposite trajectory.
        for (var i = 0; i < 3; i++)
        {
            AddIncident(dbContext, risingEmployee.Id, DateTime.UtcNow.AddDays(-i - 1));
            AddIncident(dbContext, fallingEmployee.Id, DateTime.UtcNow.AddDays(-i - 1));
        }
        for (var i = 0; i < 10; i++)
        {
            AddIncident(dbContext, fallingEmployee.Id, DateTime.UtcNow.AddDays(-40 - i));
        }

        var service = CreateService(dbContext);
        var result = await service.GetSiteSafetyRiskAsync();

        var rising = result.Single(r => r.SiteId == risingSite.Id);
        var falling = result.Single(r => r.SiteId == fallingSite.Id);

        Assert.Equal(SafetyRiskTrend.Rising, rising.Trend);
        Assert.Equal(SafetyRiskTrend.Falling, falling.Trend);
        Assert.True(rising.Score > falling.Score);
    }

    [Fact]
    public async Task GetSiteSafetyRisk_OverduePpeAndCertificateGaps_AreReportedAsContributors()
    {
        using var dbContext = TestDbContextFactory.Create();
        var site = AddSite(dbContext, "Site A");
        var employee = AddEmployeeAtSite(dbContext, site.Id);
        var hr = AddEmployeeAtSite(dbContext, site.Id);

        dbContext.PpeRequests.Add(new PpeRequest
        {
            Id = Guid.NewGuid(),
            EmployeeId = employee.Id,
            ItemType = PpeItemType.Helmet,
            Quantity = 1,
            Reason = "Wear and tear",
            Status = PpeRequestStatus.Pending,
            CreatedAtUtc = DateTime.UtcNow.AddDays(-30),
        });
        dbContext.Certificates.Add(new Certificate
        {
            Id = Guid.NewGuid(),
            EmployeeId = employee.Id,
            Title = "First Aid",
            IssuedDate = DateOnly.FromDateTime(DateTime.UtcNow.AddYears(-1)),
            ExpiryDate = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(5)),
            IssuedByEmployeeId = hr.Id,
        });
        dbContext.SaveChanges();

        var service = CreateService(dbContext);
        var result = await service.GetSiteSafetyRiskAsync();

        var entry = Assert.Single(result);
        Assert.Equal(1, entry.OverduePpeRequests);
        Assert.Equal(1, entry.CertificatesExpiredOrDueSoon);
        Assert.Contains(entry.Contributors, c => c.Contains("PPE request"));
        Assert.Contains(entry.Contributors, c => c.Contains("certificate"));
    }
}
