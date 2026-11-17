using System.Text.Json;
using AcmeHR.Application.Common;
using AcmeHR.Application.Workflows;

namespace AcmeHR.Infrastructure.Workflows.Actions;

internal static class WebhookActionExecutor
{
    public static async Task<Result<string>> ExecuteAsync(
        WorkflowNodeDto node, IWebhookSender webhookSender, CancellationToken cancellationToken)
    {
        var url = node.Data.GetStringOrNull("url");
        if (string.IsNullOrWhiteSpace(url))
        {
            return Result<string>.Failure("Webhook node is missing a target URL.");
        }

        // No templating/interpolation in this pass - the payload is sent exactly as configured.
        var payload = node.Data.GetStringOrNull("payloadTemplate") ?? "{}";
        var headers = node.Data.GetStringDictionaryOrNull("headers");

        var result = await webhookSender.SendAsync(url, headers, payload, cancellationToken);
        return result.Succeeded
            ? Result<string>.Success(JsonSerializer.Serialize(new { statusCode = result.Value!.StatusCode }))
            : Result<string>.Failure(result.Error!);
    }
}
