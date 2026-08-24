namespace AcmeHR.Application.Agents;

public record AiChatMessage(string Role, string Content); // Role is "user" | "assistant"

public record AiBoardMemberContext(Guid EmployeeId, string FullName, string JobTitle);

public record AiBoardTaskContext(
    Guid TaskId,
    string Title,
    string? Description,
    Guid? AssigneeEmployeeId,
    string? AssigneeName,
    string Status,
    DateOnly? DueDate,
    DateTime CreatedAtUtc,
    DateTime? CompletedAtUtc);

public record AiBoardContext(
    Guid BoardId,
    string BoardName,
    IReadOnlyList<AiBoardMemberContext> Members,
    IReadOnlyList<AiBoardTaskContext> Tasks);

public record AiChatRequest(
    AiBoardContext Board,
    IReadOnlyList<AiChatMessage> History,
    string UserMessage,
    bool ToolsEnabled);

/// <summary>A mutation the agent wants to perform. ArgumentsJson's shape is defined per ToolName
/// by whatever dispatches tool calls (see AgentToolDispatcher, added in Phase 2) — this record
/// itself stays opaque to keep the provider boundary generic.</summary>
public record AiToolCall(string ToolName, string ArgumentsJson);

public record AiChatResponse(string ReplyText, IReadOnlyList<AiToolCall> ProposedToolCalls);

public record AiSummaryRequest(AiBoardContext Board, DateOnly? SinceDate);

public record AiTaskSuggestionRequest(AiBoardContext Board, string TitleDraft, string? DescriptionDraft);

public record AiTaskSuggestion(
    Guid? SuggestedAssigneeEmployeeId,
    string? SuggestedAssigneeReason,
    DateOnly? SuggestedDueDate,
    string? SuggestedDueDateReason,
    string? SuggestedPriorityLabel,
    string? SuggestedPriorityReason);
