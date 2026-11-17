using AcmeHR.Domain.Enums;

namespace AcmeHR.Domain.Entities;

public class WorkflowRunStep
{
    public Guid Id { get; set; }

    public Guid WorkflowRunId { get; set; }
    public WorkflowRun? WorkflowRun { get; set; }

    public string NodeId { get; set; } = string.Empty;
    public string NodeType { get; set; } = string.Empty;

    public WorkflowStepStatus Status { get; set; } = WorkflowStepStatus.Pending;

    public string? InputJson { get; set; }
    public string? OutputJson { get; set; }
    public string? ErrorMessage { get; set; }

    public DateTime? StartedAtUtc { get; set; }
    public DateTime? CompletedAtUtc { get; set; }

    public int SequenceNumber { get; set; }
}
