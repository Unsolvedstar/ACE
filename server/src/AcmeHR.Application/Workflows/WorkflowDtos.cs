namespace AcmeHR.Application.Workflows;

public record CreateWorkflowRequest(string Name, string? Description);

public record UpdateWorkflowRequest(string Name, string? Description, string GraphJson);

public record SetWorkflowEnabledRequest(bool IsEnabled);

public record WorkflowSummaryDto(
    Guid Id,
    string Name,
    string? Description,
    bool IsEnabled,
    Guid OwnerEmployeeId,
    string OwnerEmployeeName,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc);

public record WorkflowDto(
    Guid Id,
    string Name,
    string? Description,
    bool IsEnabled,
    Guid OwnerEmployeeId,
    string OwnerEmployeeName,
    string GraphJson,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc);
