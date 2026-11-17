namespace AcmeHR.Application.Reports;

public interface IReportsService
{
    Task<ReportsSummaryDto> GetSummaryAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<SiteSafetyRiskDto>> GetSiteSafetyRiskAsync(CancellationToken cancellationToken = default);
}
