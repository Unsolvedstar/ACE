using AcmeHR.Domain.Enums;

namespace AcmeHR.Application.Dashboard;

public record RecentShiftRequestDto(
    Guid Id,
    string EmployeeName,
    DateOnly RequestedShiftDate,
    ShiftType RequestedShiftType,
    ShiftRequestStatus Status,
    DateTime CreatedAtUtc);

public record DashboardSummaryDto(
    int PendingLeaveCount,
    int IncidentsThisMonth,
    double? MedicalCompliancePercent,
    double? TrainingCompliancePercent,
    double? MyKpiOverallScorePercent,
    IReadOnlyList<RecentShiftRequestDto> RecentShiftRequests);
