using AcmeHR.Domain.Enums;

namespace AcmeHR.Application.Reports;

public record RoleHeadcountDto(EmployeeRole Role, int Count);

public record IncidentSeverityCountDto(IncidentSeverity Severity, int Count);

public record ReportsSummaryDto(
    int TotalEmployees,
    int ActiveEmployees,
    IReadOnlyList<RoleHeadcountDto> HeadcountByRole,
    int OpenIncidents,
    int ClosedIncidents,
    IReadOnlyList<IncidentSeverityCountDto> OpenIncidentsBySeverity,
    int PendingLeaveRequests,
    int ValidCertificates,
    int DueSoonCertificates,
    int ExpiredCertificates,
    int PendingPpeRequests,
    int PpeAwaitingIssue,
    int PendingLegalAppointments,
    int ActiveLegalAppointments);

/// <summary>
/// A transparent, explainable per-site safety risk score (0-100, higher = riskier) — not a
/// black-box ML prediction. It combines each site's incident rate, PPE issuance backlog, and
/// certificate expiry gap (each normalized against the average across your own sites, so the
/// score reads as "relative to your other sites" rather than an invented absolute threshold),
/// plus a trend adjustment comparing the last 30 days of incidents to the 30 before that. Any
/// Critical-severity incident in the last 30 days floors the band at Elevated regardless of the
/// numeric score, so a single serious incident can never be averaged away.
/// </summary>
public record SiteSafetyRiskDto(
    Guid SiteId,
    string SiteName,
    int Score,
    SafetyRiskBand Band,
    SafetyRiskTrend Trend,
    int ActiveEmployeeCount,
    int IncidentsLast30Days,
    int IncidentsPrior30Days,
    int OverduePpeRequests,
    int CertificatesExpiredOrDueSoon,
    IReadOnlyList<string> Contributors);
