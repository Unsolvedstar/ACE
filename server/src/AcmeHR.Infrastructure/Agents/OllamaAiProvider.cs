using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using AcmeHR.Application.Agents;
using Microsoft.Extensions.Options;

namespace AcmeHR.Infrastructure.Agents;

/// <summary>
/// Calls a locally-running Ollama server (https://ollama.com) — a free, self-hosted LLM,
/// no API key and no per-token billing. Requires Ollama running locally with a model pulled
/// (see AiProviderSettings.Model). Falls back to a friendly error reply/null suggestion rather
/// than throwing if the local server is unreachable or slow, since it's a dev-machine dependency
/// that can legitimately be off.
/// </summary>
public class OllamaAiProvider(HttpClient httpClient, IOptions<AiProviderSettings> settings) : IAiProvider
{
    private const string DefaultModel = "llama3.2";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private record OllamaMessage(string Role, string Content);
    private record OllamaFunctionCall(string Name, JsonElement Arguments);
    private record OllamaToolCall(OllamaFunctionCall Function);
    private record OllamaResponseMessage(string Role, string? Content, List<OllamaToolCall>? ToolCalls);
    private record OllamaChatResponse(OllamaResponseMessage? Message);
    private record OllamaChatRequest(string Model, List<OllamaMessage> Messages, bool Stream, object? Tools = null, string? Format = null);

    public async Task<AiChatResponse> GetChatResponseAsync(AiChatRequest request, CancellationToken cancellationToken = default)
    {
        var messages = new List<OllamaMessage> { new("system", BuildBoardSystemPrompt(request.Board, request.ToolsEnabled)) };
        messages.AddRange(request.History.Select(h => new OllamaMessage(h.Role, h.Content)));
        messages.Add(new OllamaMessage("user", request.UserMessage));

        var chatRequest = new OllamaChatRequest(
            ModelName, messages, Stream: false, Tools: request.ToolsEnabled ? BuildToolDefinitions() : null);

        try
        {
            using var response = await httpClient.PostAsJsonAsync("api/chat", chatRequest, JsonOptions, cancellationToken);
            response.EnsureSuccessStatusCode();
            var body = await response.Content.ReadFromJsonAsync<OllamaChatResponse>(JsonOptions, cancellationToken);

            var toolCalls = (body?.Message?.ToolCalls ?? [])
                .Select(tc => new AiToolCall(tc.Function.Name, JsonSerializer.Serialize(tc.Function.Arguments, JsonOptions)))
                .ToList();

            var replyText = body?.Message?.Content?.Trim();
            if (string.IsNullOrEmpty(replyText))
            {
                replyText = "(The model returned an empty reply.)";
            }
            else if (LooksLikeStrayToolCallJson(replyText))
            {
                // Small local models occasionally write a tool-call-shaped object into the text
                // content instead of using the real tool-calling mechanism, especially when no
                // real tool applies to the question. Never show that raw JSON to the user.
                replyText = "I couldn't quite work out how to answer that from the board data. Could you rephrase it?";
            }

            return new AiChatResponse(replyText, toolCalls);
        }
        catch (Exception)
        {
            return new AiChatResponse(
                $"I couldn't reach the local model at {httpClient.BaseAddress} — make sure Ollama is running (`ollama serve`) and the model is pulled.",
                []);
        }
    }

    public async Task<string> SummarizeAsync(AiSummaryRequest request, CancellationToken cancellationToken = default)
    {
        var messages = new List<OllamaMessage>
        {
            new("system", BuildBoardSystemPrompt(request.Board, toolsEnabled: false)),
            new("user", "Write a concise standup summary of this board: overall progress, who's doing what, and anything overdue."),
        };
        var chatRequest = new OllamaChatRequest(ModelName, messages, Stream: false);

        try
        {
            using var response = await httpClient.PostAsJsonAsync("api/chat", chatRequest, JsonOptions, cancellationToken);
            response.EnsureSuccessStatusCode();
            var body = await response.Content.ReadFromJsonAsync<OllamaChatResponse>(JsonOptions, cancellationToken);
            var text = body?.Message?.Content?.Trim();
            return string.IsNullOrEmpty(text) ? "(The model returned an empty summary.)" : text;
        }
        catch (Exception)
        {
            return $"Couldn't reach the local model at {httpClient.BaseAddress} to generate a summary.";
        }
    }

    public async Task<AiTaskSuggestion> SuggestTaskFieldsAsync(AiTaskSuggestionRequest request, CancellationToken cancellationToken = default)
    {
        var prompt = new StringBuilder()
            .AppendLine("A new task is being created with this draft title/description:")
            .AppendLine($"Title: {request.TitleDraft}")
            .AppendLine($"Description: {request.DescriptionDraft ?? "(none)"}")
            .AppendLine()
            .AppendLine("Respond with ONLY a JSON object (no other text) with these exact keys:")
            .AppendLine("{\"suggestedAssigneeEmployeeId\": string or null (an id from the member list), " +
                         "\"suggestedAssigneeReason\": string or null, " +
                         "\"suggestedDueDate\": string or null (YYYY-MM-DD), " +
                         "\"suggestedDueDateReason\": string or null, " +
                         "\"suggestedPriorityLabel\": one of \"Critical\", \"Important\", \"Normal\", or null, " +
                         "\"suggestedPriorityReason\": string or null}")
            .ToString();

        var messages = new List<OllamaMessage>
        {
            new("system", BuildBoardSystemPrompt(request.Board, toolsEnabled: false)),
            new("user", prompt),
        };
        var chatRequest = new OllamaChatRequest(ModelName, messages, Stream: false, Format: "json");

        try
        {
            using var response = await httpClient.PostAsJsonAsync("api/chat", chatRequest, JsonOptions, cancellationToken);
            response.EnsureSuccessStatusCode();
            var body = await response.Content.ReadFromJsonAsync<OllamaChatResponse>(JsonOptions, cancellationToken);
            var json = body?.Message?.Content;
            if (string.IsNullOrWhiteSpace(json))
            {
                return new AiTaskSuggestion(null, null, null, null, null, null);
            }

            var parsed = JsonSerializer.Deserialize<AiTaskSuggestion>(
                json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            return parsed ?? new AiTaskSuggestion(null, null, null, null, null, null);
        }
        catch (Exception)
        {
            return new AiTaskSuggestion(null, null, null, null, null, null);
        }
    }

    private string ModelName => string.IsNullOrWhiteSpace(settings.Value.Model) ? DefaultModel : settings.Value.Model;

    private static bool LooksLikeStrayToolCallJson(string text)
    {
        if (text.Length > 300 || !text.TrimStart().StartsWith('{') || !text.TrimEnd().EndsWith('}'))
        {
            return false;
        }

        try
        {
            using var doc = JsonDocument.Parse(text);
            var root = doc.RootElement;
            return root.ValueKind == JsonValueKind.Object &&
                   (root.TryGetProperty("name", out _) || root.TryGetProperty("function", out _) || root.TryGetProperty("tool", out _)) &&
                   root.TryGetProperty("parameters", out _);
        }
        catch (JsonException)
        {
            return false;
        }
    }

    private static string BuildBoardSystemPrompt(AiBoardContext board, bool toolsEnabled)
    {
        var sb = new StringBuilder();
        sb.AppendLine("You are an AI assistant embedded in a mining company's HR & safety management system, helping with one project board.");
        sb.AppendLine($"Board: \"{board.BoardName}\" (id: {board.BoardId})");
        sb.AppendLine();
        sb.AppendLine("Members:");
        foreach (var member in board.Members)
        {
            sb.AppendLine($"- {member.FullName} ({member.JobTitle}), id: {member.EmployeeId}");
        }
        sb.AppendLine();
        sb.AppendLine("Tasks:");
        foreach (var task in board.Tasks)
        {
            var due = task.DueDate?.ToString("yyyy-MM-dd") ?? "none";
            sb.AppendLine($"- \"{task.Title}\" (id: {task.TaskId}), status: {task.Status}, assignee: {task.AssigneeName ?? "unassigned"}, due: {due}");
        }
        sb.AppendLine();
        sb.AppendLine("Answer using only the data above. Be concise, and reply in plain conversational English — never JSON, never a tool-call-shaped object, never code.");
        sb.AppendLine(toolsEnabled
            ? "The only four things you can DO (not just discuss) are: create a task, change a task's status, reassign a task, or change a task's deadline — use the matching tool with the correct id(s) from the lists above, and only when the request is unambiguous (ask a clarifying question in plain text instead of guessing). For every other message — questions, greetings, anything not one of those four actions — just answer directly in plain text. Do not call a tool, and do not describe a tool call in your text, unless the user is clearly asking for one of those four actions."
            : "You cannot take any actions in this conversation — only answer questions, in plain text.");
        return sb.ToString();
    }

    private static object[] BuildToolDefinitions() =>
    [
        ToolDef("CreateTask", "Create a new task on this board.", new
        {
            type = "object",
            properties = new
            {
                title = new { type = "string", description = "Short task title." },
                description = new { type = "string", description = "Optional longer description." },
                assigneeEmployeeId = new { type = "string", description = "id of the board member to assign, from the member list. Omit if unassigned." },
                dueDate = new { type = "string", description = "Due date as YYYY-MM-DD. Omit if none." },
            },
            required = new[] { "title" },
        }),
        ToolDef("UpdateTaskStatus", "Change an existing task's status.", new
        {
            type = "object",
            properties = new
            {
                taskId = new { type = "string", description = "id of the task, from the task list." },
                status = new { type = "integer", @enum = new[] { 0, 1, 2 }, description = "0 = Todo, 1 = In Progress, 2 = Done" },
            },
            required = new[] { "taskId", "status" },
        }),
        ToolDef("AssignTask", "Reassign an existing task to a different board member.", new
        {
            type = "object",
            properties = new
            {
                taskId = new { type = "string", description = "id of the task, from the task list." },
                assigneeEmployeeId = new { type = "string", description = "id of the board member to assign, from the member list." },
            },
            required = new[] { "taskId", "assigneeEmployeeId" },
        }),
        ToolDef("SetDeadline", "Change an existing task's due date.", new
        {
            type = "object",
            properties = new
            {
                taskId = new { type = "string", description = "id of the task, from the task list." },
                dueDate = new { type = "string", description = "New due date as YYYY-MM-DD." },
            },
            required = new[] { "taskId", "dueDate" },
        }),
    ];

    private static object ToolDef(string name, string description, object parameters) =>
        new { type = "function", function = new { name, description, parameters } };
}
