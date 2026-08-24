namespace AcmeHR.Infrastructure.Agents;

public class AiProviderSettings
{
    public const string SectionName = "AiProvider";

    // "Mock" (default, no external calls) | "AnthropicClaude" (not implemented yet)
    public string Provider { get; set; } = "Mock";
    public string? ApiKey { get; set; }
    public string? Model { get; set; }
    public int MaxHistoryMessages { get; set; } = 20;
}
