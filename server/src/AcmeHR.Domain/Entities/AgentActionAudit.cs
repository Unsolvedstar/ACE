using AcmeHR.Domain.Enums;

namespace AcmeHR.Domain.Entities;

public class AgentActionAudit
{
    public Guid Id { get; set; }

    public Guid BoardId { get; set; }
    public Board? Board { get; set; }

    public Guid? ConversationId { get; set; }
    public AgentConversation? Conversation { get; set; }

    public Guid RequestedByEmployeeId { get; set; }
    public Employee? RequestedByEmployee { get; set; }

    public AgentToolName ToolName { get; set; }
    public string ArgumentsJson { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;

    public Guid? TargetTaskId { get; set; }
    public BoardTask? TargetTask { get; set; }

    public AgentActionStatus Status { get; set; } = AgentActionStatus.Proposed;
    public string? ResultDetail { get; set; }

    public Guid? DecidedByEmployeeId { get; set; }
    public Employee? DecidedByEmployee { get; set; }
    public DateTime? DecidedAtUtc { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? ExecutedAtUtc { get; set; }
}
