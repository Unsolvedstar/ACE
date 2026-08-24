using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
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

        if (request.ToolsEnabled)
        {
            var toolCall = TryBuildToolCall(message, request.Board);
            if (toolCall is not null)
            {
                return Task.FromResult(new AiChatResponse("On it — I've proposed that action.", new[] { toolCall }));
            }
        }

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

    private static readonly string[] UrgencyKeywords = ["urgent", "asap", "critical", "safety", "incident", "hazard"];

    public Task<AiTaskSuggestion> SuggestTaskFieldsAsync(AiTaskSuggestionRequest request, CancellationToken cancellationToken = default)
    {
        var board = request.Board;
        var combinedText = $"{request.TitleDraft} {request.DescriptionDraft}".ToLowerInvariant();
        var isUrgent = UrgencyKeywords.Any(keyword => combinedText.Contains(keyword));

        AiTaskSuggestion result;
        if (board.Members.Count == 0)
        {
            result = new AiTaskSuggestion(null, null, null, null, null, null);
        }
        else
        {
            var leastLoaded = board.Members
                .Select(member => new
                {
                    Member = member,
                    OpenCount = board.Tasks.Count(t => t.AssigneeEmployeeId == member.EmployeeId && t.Status != "Done"),
                })
                .OrderBy(x => x.OpenCount)
                .ThenBy(x => x.Member.FullName)
                .First();

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var dueDate = isUrgent ? today.AddDays(2) : today.AddDays(7);
            var dueDateReason = isUrgent ? "Flagged as urgent/safety-related." : "Default one-week turnaround.";
            var priorityLabel = isUrgent ? "Critical" : "Normal";
            var priorityReason = isUrgent
                ? "Mentions urgency or safety-related keywords."
                : "No urgency or safety keywords detected.";

            result = new AiTaskSuggestion(
                leastLoaded.Member.EmployeeId,
                $"Has the fewest open tasks ({leastLoaded.OpenCount}) on this board.",
                dueDate,
                dueDateReason,
                priorityLabel,
                priorityReason);
        }

        return Task.FromResult(result);
    }

    // Deliberately conservative: only clearly-structured phrasings propose a mutation. Anything
    // ambiguous falls through to the read-only rules above rather than guessing at intent.
    private static AiToolCall? TryBuildToolCall(string message, AiBoardContext board)
    {
        var createMatch = Regex.Match(
            message, "^create task \"(?<title>.+?)\"(?: for (?<assignee>.+?))?(?: by (?<due>.+))?$", RegexOptions.IgnoreCase);
        if (createMatch.Success)
        {
            var assignee = createMatch.Groups["assignee"].Success ? FindMemberByName(board, createMatch.Groups["assignee"].Value) : null;
            var dueDate = createMatch.Groups["due"].Success ? ResolveDatePhrase(createMatch.Groups["due"].Value) : null;
            return new AiToolCall(nameof(Domain.Enums.AgentToolName.CreateTask), SerializeArgs(new
            {
                Title = createMatch.Groups["title"].Value,
                Description = (string?)null,
                AssigneeEmployeeId = assignee?.EmployeeId,
                DueDate = dueDate,
            }));
        }

        var moveMatch = Regex.Match(
            message, "^(?:mark|move) \"(?<title>.+?)\" (?:to )?(?<status>done|in progress|todo)$", RegexOptions.IgnoreCase);
        if (moveMatch.Success)
        {
            var task = FindTaskByTitle(board, moveMatch.Groups["title"].Value);
            var status = moveMatch.Groups["status"].Value.ToLowerInvariant() switch
            {
                "done" => Domain.Enums.BoardTaskStatus.Done,
                "in progress" => Domain.Enums.BoardTaskStatus.InProgress,
                _ => Domain.Enums.BoardTaskStatus.Todo,
            };
            if (task is not null)
            {
                return new AiToolCall(nameof(Domain.Enums.AgentToolName.UpdateTaskStatus), SerializeArgs(new
                {
                    TaskId = task.TaskId,
                    Status = status,
                }));
            }
        }

        var assignMatch = Regex.Match(message, "^assign \"(?<title>.+?)\" to (?<assignee>.+)$", RegexOptions.IgnoreCase);
        if (assignMatch.Success)
        {
            var task = FindTaskByTitle(board, assignMatch.Groups["title"].Value);
            var assignee = FindMemberByName(board, assignMatch.Groups["assignee"].Value);
            if (task is not null && assignee is not null)
            {
                return new AiToolCall(nameof(Domain.Enums.AgentToolName.AssignTask), SerializeArgs(new
                {
                    TaskId = task.TaskId,
                    AssigneeEmployeeId = assignee.EmployeeId,
                }));
            }
        }

        var deadlineMatch = Regex.Match(
            message, "^(?:set|change) (?:the )?deadline (?:for|of) \"(?<title>.+?)\" to (?<due>.+)$", RegexOptions.IgnoreCase);
        if (deadlineMatch.Success)
        {
            var task = FindTaskByTitle(board, deadlineMatch.Groups["title"].Value);
            var dueDate = ResolveDatePhrase(deadlineMatch.Groups["due"].Value);
            if (task is not null && dueDate is not null)
            {
                return new AiToolCall(nameof(Domain.Enums.AgentToolName.SetDeadline), SerializeArgs(new
                {
                    TaskId = task.TaskId,
                    DueDate = dueDate,
                }));
            }
        }

        return null;
    }

    private static AiBoardMemberContext? FindMemberByName(AiBoardContext board, string namePart) =>
        board.Members.FirstOrDefault(m => string.Equals(m.FullName, namePart.Trim(), StringComparison.OrdinalIgnoreCase))
        ?? board.Members.FirstOrDefault(m => m.FullName.Contains(namePart.Trim(), StringComparison.OrdinalIgnoreCase));

    private static AiBoardTaskContext? FindTaskByTitle(AiBoardContext board, string titlePart) =>
        board.Tasks.FirstOrDefault(t => string.Equals(t.Title, titlePart.Trim(), StringComparison.OrdinalIgnoreCase))
        ?? board.Tasks.FirstOrDefault(t => t.Title.Contains(titlePart.Trim(), StringComparison.OrdinalIgnoreCase));

    private static readonly string[] Weekdays =
        ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

    private static DateOnly? ResolveDatePhrase(string phrase)
    {
        var trimmed = phrase.Trim().TrimEnd('.').ToLowerInvariant();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        if (trimmed == "today") return today;
        if (trimmed == "tomorrow") return today.AddDays(1);

        var weekdayIndex = Array.IndexOf(Weekdays, trimmed);
        if (weekdayIndex >= 0)
        {
            var daysAhead = ((weekdayIndex - (int)today.DayOfWeek) + 7) % 7;
            daysAhead = daysAhead == 0 ? 7 : daysAhead;
            return today.AddDays(daysAhead);
        }

        return DateOnly.TryParse(trimmed, out var parsed) ? parsed : null;
    }

    private static readonly JsonSerializerOptions ArgsJsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    private static string SerializeArgs<T>(T args) => JsonSerializer.Serialize(args, ArgsJsonOptions);

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
