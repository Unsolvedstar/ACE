namespace AcmeHR.Domain.Entities;

public class Workflow
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    public Guid OwnerEmployeeId { get; set; }
    public Employee? OwnerEmployee { get; set; }

    public bool IsEnabled { get; set; } = true;

    public string GraphJson { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAtUtc { get; set; }

    public ICollection<WorkflowRun> Runs { get; set; } = new List<WorkflowRun>();
}
