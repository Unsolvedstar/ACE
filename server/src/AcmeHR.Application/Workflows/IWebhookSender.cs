using AcmeHR.Application.Common;

namespace AcmeHR.Application.Workflows;

public record WebhookCallResult(int StatusCode, string? ResponseBodySnippet);

public interface IWebhookSender
{
    Task<Result<WebhookCallResult>> SendAsync(
        string url,
        IReadOnlyDictionary<string, string>? headers,
        string jsonPayload,
        CancellationToken cancellationToken = default);
}
