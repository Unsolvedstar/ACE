using AcmeHR.Domain.Enums;

namespace AcmeHR.Domain.Entities;

public class WorkflowRun
{
    public Guid Id { get; set; }

    public Guid WorkflowId { get; set; }
    public Workflow? Workflow { get; set; }

    public Guid TriggeredByEmployeeId { get; set; }
    public Employee? TriggeredByEmployee { get; set; }

    public WorkflowRunStatus Status { get; set; } = WorkflowRunStatus.Queued;

    public DateTime QueuedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? StartedAtUtc { get; set; }
    public DateTime? CompletedAtUtc { get; set; }

    public string? ErrorMessage { get; set; }

    public ICollection<WorkflowRunStep> Steps { get; set; } = new List<WorkflowRunStep>();
}
