using AcmeHR.Domain.Enums;

namespace AcmeHR.Application.Workflows;

public record WorkflowRunStepDto(
    Guid Id,
    string NodeId,
    string NodeType,
    WorkflowStepStatus Status,
    string? InputJson,
    string? OutputJson,
    string? ErrorMessage,
    DateTime? StartedAtUtc,
    DateTime? CompletedAtUtc,
    int SequenceNumber);

public record WorkflowRunDto(
    Guid Id,
    Guid WorkflowId,
    WorkflowRunStatus Status,
    Guid TriggeredByEmployeeId,
    string TriggeredByEmployeeName,
    DateTime QueuedAtUtc,
    DateTime? StartedAtUtc,
    DateTime? CompletedAtUtc,
    string? ErrorMessage,
    IReadOnlyList<WorkflowRunStepDto> Steps);
