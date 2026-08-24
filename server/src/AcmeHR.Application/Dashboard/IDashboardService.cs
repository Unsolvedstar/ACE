namespace AcmeHR.Application.Dashboard;

public interface IDashboardService
{
    Task<DashboardSummaryDto> GetSummaryAsync(Guid employeeId, CancellationToken cancellationToken = default);
}
