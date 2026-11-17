using AcmeHR.Application.Common;

namespace AcmeHR.Application.Incidents;

public interface IIncidentService
{
    Task<Result<IncidentReportDto>> SubmitAsync(
        Guid reporterEmployeeId, SubmitIncidentReportRequest request, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<IncidentReportDto>> GetMyIncidentsAsync(
        Guid employeeId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<IncidentReportDto>> GetAllIncidentsAsync(
        CancellationToken cancellationToken = default);

    Task<Result<IncidentReportDto>> UpdateStatusAsync(
        Guid incidentId, Guid reviewerId, UpdateIncidentStatusRequest request, CancellationToken cancellationToken = default);
}
