using System.Text;
using AcmeHR.Application.Agents;

namespace AcmeHR.Infrastructure.Agents;

/// <summary>
/// Deterministic, rule-based stand-in for a real LLM provider. Every reply is grounded in
/// the actual board data passed in — no external calls, no API key needed — so the agent
/// feature is fully usable and testable before a real provider (see Phase 4) is wired up.
/// </summary>
public class RuleBasedAiProvider : IAiProvider
{
    public Task<AiChatResponse> GetChatResponseAsync(AiChatRequest request, CancellationToken cancellationToken = default)
    {
        var message = request.UserMessage.Trim();
        var lower = message.ToLowerInvariant();

        string reply;
        if (lower.Contains("overdue"))
        {
            reply = DescribeOverdueTasks(request.Board);
        }
        else if (lower.Contains("workload") || lower.Contains("who is busy") || lower.Contains("who has the most tasks"))
        {
            reply = DescribeWorkload(request.Board);
        }
        else if (lower.Contains("summary") || lower.Contains("standup"))
        {
            reply = BuildSummary(request.Board);
        }
        else
        {
            reply = DescribeDefault(request.Board);
        }

        return Task.FromResult(new AiChatResponse(reply, Array.Empty<AiToolCall>()));
    }

    public Task<string> SummarizeAsync(AiSummaryRequest request, CancellationToken cancellationToken = default) =>
        Task.FromResult(BuildSummary(request.Board));

    public Task<AiTaskSuggestion> SuggestTaskFieldsAsync(AiTaskSuggestionRequest request, CancellationToken cancellationToken = default) =>
        Task.FromResult(new AiTaskSuggestion(null, null, null, null, null, null));

    private static string DescribeOverdueTasks(AiBoardContext board)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var overdue = board.Tasks
            .Where(t => t.Status != "Done" && t.DueDate.HasValue && t.DueDate.Value < today)
            .OrderBy(t => t.DueDate)
            .ToList();

        if (overdue.Count == 0)
        {
            return "Nothing is overdue right now.";
        }

        var sb = new StringBuilder();
        sb.AppendLine($"{overdue.Count} task(s) overdue:");
        foreach (var task in overdue)
        {
            var daysOverdue = today.DayNumber - task.DueDate!.Value.DayNumber;
            var assignee = task.AssigneeName ?? "Unassigned";
            sb.AppendLine($"- \"{task.Title}\" ({assignee}, {daysOverdue} day(s) overdue)");
        }
        return sb.ToString().TrimEnd();
    }

    private static string DescribeWorkload(AiBoardContext board)
    {
        var openCountsByMember = board.Members
            .Select(member => new
            {
                member.FullName,
                OpenCount = board.Tasks.Count(t => t.AssigneeEmployeeId == member.EmployeeId && t.Status != "Done"),
            })
            .OrderByDescending(x => x.OpenCount)
            .ToList();

        if (openCountsByMember.All(x => x.OpenCount == 0))
        {
            return "No one has any open tasks right now.";
        }

        var sb = new StringBuilder();
        sb.AppendLine("Open task counts:");
        foreach (var entry in openCountsByMember)
        {
            sb.AppendLine($"- {entry.FullName}: {entry.OpenCount} open");
        }
        return sb.ToString().TrimEnd();
    }

    private static string DescribeDefault(AiBoardContext board)
    {
        var todo = board.Tasks.Count(t => t.Status == "Todo");
        var inProgress = board.Tasks.Count(t => t.Status == "InProgress");
        var done = board.Tasks.Count(t => t.Status == "Done");

        return $"Board '{board.BoardName}' currently has {todo} to do, {inProgress} in progress, and {done} done. " +
               "I can also tell you what's overdue, who's overloaded, or generate a standup summary.";
    }

    private static string BuildSummary(AiBoardContext board)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var done = board.Tasks.Count(t => t.Status == "Done");
        var inProgress = board.Tasks.Count(t => t.Status == "InProgress");
        var todo = board.Tasks.Count(t => t.Status == "Todo");

        var sb = new StringBuilder();
        sb.AppendLine($"Board '{board.BoardName}' standup — {DateTime.UtcNow:d MMM yyyy}");
        sb.AppendLine($"{done} done, {inProgress} in progress, {todo} to do ({board.Tasks.Count} total).");

        foreach (var member in board.Members)
        {
            var memberTasks = board.Tasks.Where(t => t.AssigneeEmployeeId == member.EmployeeId).ToList();
            var memberDone = memberTasks.Count(t => t.Status == "Done");
            var memberInProgress = memberTasks.Count(t => t.Status == "InProgress");
            var memberOverdue = memberTasks.Count(t => t.Status != "Done" && t.DueDate.HasValue && t.DueDate.Value < today);
            if (memberTasks.Count == 0)
            {
                continue;
            }
            sb.AppendLine($"- {member.FullName}: {memberDone} done, {memberInProgress} in progress, {memberOverdue} overdue");
        }

        var overdueTasks = board.Tasks
            .Where(t => t.Status != "Done" && t.DueDate.HasValue && t.DueDate.Value < today)
            .OrderBy(t => t.DueDate)
            .ToList();
        if (overdueTasks.Count > 0)
        {
            sb.AppendLine("Overdue:");
            foreach (var task in overdueTasks)
            {
                var daysOverdue = today.DayNumber - task.DueDate!.Value.DayNumber;
                sb.AppendLine($"- \"{task.Title}\" ({task.AssigneeName ?? "Unassigned"}, {daysOverdue} day(s) overdue)");
            }
        }

        return sb.ToString().TrimEnd();
    }
}
