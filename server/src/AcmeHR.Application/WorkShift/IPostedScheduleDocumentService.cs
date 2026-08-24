using AcmeHR.Application.Common;

namespace AcmeHR.Application.WorkShift;

public interface IPostedScheduleDocumentService
{
    Task<Result<PostedScheduleDocumentDto>> CreateAsync(
        Guid postedByEmployeeId, CreateScheduleDocumentRequest request, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<PostedScheduleDocumentDto>> GetAllAsync(CancellationToken cancellationToken = default);

    Task<Result<bool>> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
