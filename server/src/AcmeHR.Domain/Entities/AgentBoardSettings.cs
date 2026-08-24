namespace AcmeHR.Domain.Entities;

public class AgentBoardSettings
{
    public Guid Id { get; set; }

    public Guid BoardId { get; set; }
    public Board? Board { get; set; }

    public bool AutoExecuteEnabled { get; set; }

    public Guid UpdatedByEmployeeId { get; set; }
    public Employee? UpdatedByEmployee { get; set; }
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
