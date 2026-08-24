using AcmeHR.Domain.Enums;

namespace AcmeHR.Domain.Entities;

public class AgentMessage
{
    public Guid Id { get; set; }

    public Guid ConversationId { get; set; }
    public AgentConversation? Conversation { get; set; }

    public AgentMessageRole Role { get; set; }
    public string Content { get; set; } = string.Empty;

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
