using System.Net.Http.Headers;
using System.Text;
using AcmeHR.Application.Common;
using AcmeHR.Application.Workflows;

namespace AcmeHR.Infrastructure.Workflows;

// No BaseAddress (unlike the AI providers' typed clients) since the target URL is per-node
// config, not fixed. Never throws - a webhook failure should fail its workflow step gracefully,
// not crash the executor.
public class WebhookSender(HttpClient httpClient) : IWebhookSender
{
    public async Task<Result<WebhookCallResult>> SendAsync(
        string url, IReadOnlyDictionary<string, string>? headers, string jsonPayload, CancellationToken cancellationToken = default)
    {
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(jsonPayload, Encoding.UTF8, "application/json"),
            };

            if (headers is not null)
            {
                foreach (var (key, value) in headers)
                {
                    if (!request.Headers.TryAddWithoutValidation(key, value))
                    {
                        request.Content.Headers.TryAddWithoutValidation(key, value);
                    }
                }
            }

            using var response = await httpClient.SendAsync(request, cancellationToken);
            var bodySnippet = await ReadSnippetAsync(response.Content, cancellationToken);

            return response.IsSuccessStatusCode
                ? Result<WebhookCallResult>.Success(new WebhookCallResult((int)response.StatusCode, bodySnippet))
                : Result<WebhookCallResult>.Failure($"Webhook returned {(int)response.StatusCode} {response.ReasonPhrase}.");
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            return Result<WebhookCallResult>.Failure($"Webhook call failed: {ex.Message}");
        }
    }

    private static async Task<string?> ReadSnippetAsync(HttpContent content, CancellationToken cancellationToken)
    {
        var body = await content.ReadAsStringAsync(cancellationToken);
        return string.IsNullOrEmpty(body) ? null : body[..Math.Min(body.Length, 500)];
    }
}
