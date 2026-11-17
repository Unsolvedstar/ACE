using System.Globalization;
using AcmeHR.Application.Reports;
using AcmeHR.Domain.Enums;
using AcmeHR.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AcmeHR.Infrastructure.Reports;

public class ReportsService(ApplicationDbContext dbContext) : IReportsService
{
    private const int CertificateDueSoonThresholdDays = 30;
    private const int IncidentWindowDays = 30;
    private const int PpeOverdueThresholdDays = 14;

    // Score contribution weights for the three safety-risk factors (must sum to 1.0).
    private const double IncidentWeight = 0.5;
    private const double PpeWeight = 0.25;
    private const double CertWeight = 0.25;

    // A site at exactly the org average for a factor scores 50 on that factor's 0-100 scale;
    // double the average maxes it out at 100. Linear and easy to explain, deliberately not
    // calibrated against any external safety benchmark since we don't have one.
    private const double RatioToSubScoreFactor = 50;

    private const int RisingTrendScoreBonus = 10;
    private const int FallingTrendScorePenalty = 10;

    // An incident count is "rising"/"falling" only past this margin, so noise in small counts
    // (e.g. 1 incident vs 0) doesn't flip the trend on a single data point either way.
    private const double TrendChangeThreshold = 0.15;

    public async Task<ReportsSummaryDto> GetSummaryAsync(CancellationToken cancellationToken = default)
    {
        var totalEmployees = await dbContext.Employees.CountAsync(cancellationToken);
        var activeEmployees = await dbContext.Employees.CountAsync(e => e.IsActive, cancellationToken);

        var headcountByRole = (await dbContext.Employees
            .GroupBy(e => e.Role)
            .Select(g => new { Role = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken))
            .Select(r => new RoleHeadcountDto(r.Role, r.Count))
            .OrderBy(r => r.Role)
            .ToList();

        var openIncidents = await dbContext.IncidentReports
            .CountAsync(i => i.Status != IncidentStatus.Closed, cancellationToken);
        var closedIncidents = await dbContext.IncidentReports
            .CountAsync(i => i.Status == IncidentStatus.Closed, cancellationToken);

        var openIncidentsBySeverity = (await dbContext.IncidentReports
            .Where(i => i.Status != IncidentStatus.Closed)
            .GroupBy(i => i.Severity)
            .Select(g => new { Severity = g.Key, Count = g.Count() })
            .ToListAsync(cancellationToken))
            .Select(s => new IncidentSeverityCountDto(s.Severity, s.Count))
            .OrderBy(s => s.Severity)
            .ToList();

        var pendingLeaveRequests = await dbContext.LeaveRequests
            .CountAsync(
                r => r.Status == LeaveRequestStatus.PendingLineManagerApproval || r.Status == LeaveRequestStatus.PendingHRApproval,
                cancellationToken);

        var (validCertificates, dueSoonCertificates, expiredCertificates) = await GetCertificateCountsAsync(cancellationToken);

        var pendingPpeRequests = await dbContext.PpeRequests
            .CountAsync(r => r.Status == PpeRequestStatus.Pending, cancellationToken);
        var ppeAwaitingIssue = await dbContext.PpeRequests
            .CountAsync(r => r.Status == PpeRequestStatus.Approved, cancellationToken);

        var pendingLegalAppointments = await dbContext.LegalAppointments
            .CountAsync(p => p.Status == LegalAppointmentStatus.Pending, cancellationToken);
        var activeLegalAppointments = await dbContext.LegalAppointments
            .CountAsync(p => p.Status == LegalAppointmentStatus.Active, cancellationToken);

        return new ReportsSummaryDto(
            totalEmployees,
            activeEmployees,
            headcountByRole,
            openIncidents,
            closedIncidents,
            openIncidentsBySeverity,
            pendingLeaveRequests,
            validCertificates,
            dueSoonCertificates,
            expiredCertificates,
            pendingPpeRequests,
            ppeAwaitingIssue,
            pendingLegalAppointments,
            activeLegalAppointments);
    }

    public async Task<IReadOnlyList<SiteSafetyRiskDto>> GetSiteSafetyRiskAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var windowStart = now.AddDays(-IncidentWindowDays);
        var priorWindowStart = now.AddDays(-IncidentWindowDays * 2);
        var today = DateOnly.FromDateTime(now);
        var dueSoonCutoff = today.AddDays(CertificateDueSoonThresholdDays);
        var ppeOverdueCutoff = now.AddDays(-PpeOverdueThresholdDays);

        var sites = await dbContext.Sites
            .Where(s => s.IsActive)
            .Select(s => new { s.Id, s.Name, ActiveEmployeeCount = s.Employees.Count(e => e.IsActive) })
            .ToListAsync(cancellationToken);

        if (sites.Count == 0)
        {
            return [];
        }

        // Incidents/PPE requests/certificates don't carry a SiteId of their own — they're
        // attributed to a site by joining through the employee who owns them.
        var incidentsLast30 = await dbContext.IncidentReports
            .Where(i => i.OccurredAtUtc >= windowStart)
            .Join(dbContext.Employees, i => i.EmployeeId, e => e.Id, (i, e) => new { e.SiteId, i.Severity })
            .ToListAsync(cancellationToken);

        var incidentsPrior30Counts = await dbContext.IncidentReports
            .Where(i => i.OccurredAtUtc >= priorWindowStart && i.OccurredAtUtc < windowStart)
            .Join(dbContext.Employees, i => i.EmployeeId, e => e.Id, (i, e) => e.SiteId)
            .ToListAsync(cancellationToken);

        var overduePpeSiteIds = await dbContext.PpeRequests
            .Where(r => (r.Status == PpeRequestStatus.Pending || r.Status == PpeRequestStatus.Approved) && r.CreatedAtUtc <= ppeOverdueCutoff)
            .Join(dbContext.Employees, r => r.EmployeeId, e => e.Id, (r, e) => e.SiteId)
            .ToListAsync(cancellationToken);

        var certGapSiteIds = await dbContext.Certificates
            .Where(c => c.ExpiryDate <= dueSoonCutoff)
            .Join(dbContext.Employees, c => c.EmployeeId, e => e.Id, (c, e) => e.SiteId)
            .ToListAsync(cancellationToken);

        var raw = sites.Select(site =>
        {
            var siteIncidentsLast30 = incidentsLast30.Where(i => i.SiteId == site.Id).ToList();
            var headcount = Math.Max(site.ActiveEmployeeCount, 1); // avoid divide-by-zero for an empty site
            return new
            {
                site.Id,
                site.Name,
                site.ActiveEmployeeCount,
                IncidentsLast30 = siteIncidentsLast30.Count,
                IncidentsPrior30 = incidentsPrior30Counts.Count(s => s == site.Id),
                HasCriticalLast30 = siteIncidentsLast30.Any(i => i.Severity == IncidentSeverity.Critical),
                IncidentRate = siteIncidentsLast30.Sum(i => SeverityWeight(i.Severity)) / (double)headcount,
                OverduePpeCount = overduePpeSiteIds.Count(s => s == site.Id),
                PpeGapRate = overduePpeSiteIds.Count(s => s == site.Id) / (double)headcount,
                CertGapCount = certGapSiteIds.Count(s => s == site.Id),
                CertGapRate = certGapSiteIds.Count(s => s == site.Id) / (double)headcount,
            };
        }).ToList();

        // Each factor is normalized against the average across your own sites rather than an
        // invented absolute threshold — we have no external benchmark to calibrate one against.
        var avgIncidentRate = raw.Average(r => r.IncidentRate);
        var avgPpeGapRate = raw.Average(r => r.PpeGapRate);
        var avgCertGapRate = raw.Average(r => r.CertGapRate);

        var results = new List<SiteSafetyRiskDto>();
        foreach (var r in raw)
        {
            var incidentSub = ToSubScore(r.IncidentRate, avgIncidentRate);
            var ppeSub = ToSubScore(r.PpeGapRate, avgPpeGapRate);
            var certSub = ToSubScore(r.CertGapRate, avgCertGapRate);

            var trend = r.IncidentsLast30 > r.IncidentsPrior30 * (1 + TrendChangeThreshold) ? SafetyRiskTrend.Rising
                : r.IncidentsLast30 < r.IncidentsPrior30 * (1 - TrendChangeThreshold) ? SafetyRiskTrend.Falling
                : SafetyRiskTrend.Stable;

            var trendAdjustment = trend switch
            {
                SafetyRiskTrend.Rising => RisingTrendScoreBonus,
                SafetyRiskTrend.Falling => -FallingTrendScorePenalty,
                _ => 0,
            };

            var composite = incidentSub * IncidentWeight + ppeSub * PpeWeight + certSub * CertWeight;
            var score = Math.Clamp((int)Math.Round(composite) + trendAdjustment, 0, 100);

            var band = score switch
            {
                >= 75 => SafetyRiskBand.Critical,
                >= 50 => SafetyRiskBand.Elevated,
                >= 25 => SafetyRiskBand.Moderate,
                _ => SafetyRiskBand.Low,
            };
            // A Critical-severity incident in the window is a hard floor — never let the math
            // average a serious incident away into a "Low" reading.
            if (r.HasCriticalLast30 && band < SafetyRiskBand.Elevated)
            {
                band = SafetyRiskBand.Elevated;
            }

            results.Add(new SiteSafetyRiskDto(
                r.Id, r.Name, score, band, trend, r.ActiveEmployeeCount,
                r.IncidentsLast30, r.IncidentsPrior30, r.OverduePpeCount, r.CertGapCount,
                BuildContributors(r.IncidentsLast30, r.IncidentsPrior30, r.HasCriticalLast30, trend, avgIncidentRate > 0 ? r.IncidentRate / avgIncidentRate : 0, r.OverduePpeCount, r.CertGapCount)));
        }

        return results.OrderByDescending(d => d.Score).ToList();
    }

    private static int ToSubScore(double siteRate, double orgAverageRate) =>
        (int)Math.Clamp(Math.Round((orgAverageRate > 0 ? siteRate / orgAverageRate : 0) * RatioToSubScoreFactor), 0, 100);

    private static int SeverityWeight(IncidentSeverity severity) => severity switch
    {
        IncidentSeverity.Low => 1,
        IncidentSeverity.Medium => 3,
        IncidentSeverity.High => 6,
        IncidentSeverity.Critical => 10,
        _ => 1,
    };

    private static IReadOnlyList<string> BuildContributors(
        int incidentsLast30, int incidentsPrior30, bool hasCriticalLast30, SafetyRiskTrend trend,
        double incidentRateVsAverage, int overduePpeCount, int certGapCount)
    {
        var contributors = new List<string>();

        if (hasCriticalLast30)
        {
            contributors.Add($"Includes a Critical-severity incident in the last {IncidentWindowDays} days.");
        }

        if (incidentsLast30 > 0 && incidentRateVsAverage >= 1.5)
        {
            contributors.Add(
                $"{incidentsLast30} incident{(incidentsLast30 == 1 ? "" : "s")} in the last {IncidentWindowDays} days — " +
                $"severity-weighted rate is {incidentRateVsAverage.ToString("0.0", CultureInfo.InvariantCulture)}x the average across your sites.");
        }
        else if (incidentsLast30 > 0)
        {
            contributors.Add($"{incidentsLast30} incident{(incidentsLast30 == 1 ? "" : "s")} in the last {IncidentWindowDays} days.");
        }

        if (trend == SafetyRiskTrend.Rising)
        {
            contributors.Add($"Incident count is trending up: {incidentsLast30} in the last {IncidentWindowDays} days vs {incidentsPrior30} in the {IncidentWindowDays} days before that.");
        }
        else if (trend == SafetyRiskTrend.Falling)
        {
            contributors.Add($"Incident count is trending down: {incidentsLast30} in the last {IncidentWindowDays} days vs {incidentsPrior30} in the {IncidentWindowDays} days before that.");
        }

        if (overduePpeCount > 0)
        {
            contributors.Add($"{overduePpeCount} PPE request{(overduePpeCount == 1 ? "" : "s")} pending or approved for over {PpeOverdueThresholdDays} days without being issued.");
        }

        if (certGapCount > 0)
        {
            contributors.Add($"{certGapCount} certificate{(certGapCount == 1 ? "" : "s")} expired or expiring within {CertificateDueSoonThresholdDays} days.");
        }

        if (contributors.Count == 0)
        {
            contributors.Add("No elevated incident, PPE, or certificate signals in the current window.");
        }

        return contributors;
    }

    private async Task<(int Valid, int DueSoon, int Expired)> GetCertificateCountsAsync(CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var dueSoonCutoff = today.AddDays(CertificateDueSoonThresholdDays);

        var expired = await dbContext.Certificates.CountAsync(c => c.ExpiryDate < today, cancellationToken);
        var dueSoon = await dbContext.Certificates
            .CountAsync(c => c.ExpiryDate >= today && c.ExpiryDate <= dueSoonCutoff, cancellationToken);
        var valid = await dbContext.Certificates.CountAsync(c => c.ExpiryDate > dueSoonCutoff, cancellationToken);

        return (valid, dueSoon, expired);
    }
}
