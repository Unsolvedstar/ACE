using AcmeHR.Application.Common;

namespace AcmeHR.Application.Certificates;

public interface ICertificateService
{
    Task<Result<CertificateDto>> IssueAsync(
        Guid issuerEmployeeId, IssueCertificateRequest request, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<CertificateDto>> GetMyCertificatesAsync(
        Guid employeeId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<CertificateDto>> GetAllAsync(CancellationToken cancellationToken = default);
}
