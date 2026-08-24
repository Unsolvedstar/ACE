namespace AcmeHR.Domain.Entities;

public class AgentConversation
{
    public Guid Id { get; set; }

    public Guid BoardId { get; set; }
    public Board? Board { get; set; }

    public Guid EmployeeId { get; set; }
    public Employee? Employee { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime LastMessageAtUtc { get; set; } = DateTime.UtcNow;

    public ICollection<AgentMessage> Messages { get; set; } = new List<AgentMessage>();
}
