namespace AcmeHR.Application.Agents;

/// <summary>
/// Provider-agnostic boundary for whatever generates chat replies, summaries, and task
/// suggestions. DTOs below deliberately avoid Domain enums/types so a future real-LLM
/// provider (e.g. Anthropic Claude) can be swapped in via config alone, with zero changes
/// to any Application/Infrastructure call site.
/// </summary>
public interface IAiProvider
{
    Task<AiChatResponse> GetChatResponseAsync(AiChatRequest request, CancellationToken cancellationToken = default);

    Task<string> SummarizeAsync(AiSummaryRequest request, CancellationToken cancellationToken = default);

    Task<AiTaskSuggestion> SuggestTaskFieldsAsync(AiTaskSuggestionRequest request, CancellationToken cancellationToken = default);
}
