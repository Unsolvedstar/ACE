using AcmeHR.Application.Common;

namespace AcmeHR.Application.Timesheet;

public interface IClockingReportParserService
{
    Task<Result<ClockingReportParseResultDto>> ParseAsync(
        Stream fileStream,
        string fileName,
        string workDays,
        double hoursPerDay,
        bool rotating,
        CancellationToken cancellationToken = default);
}
