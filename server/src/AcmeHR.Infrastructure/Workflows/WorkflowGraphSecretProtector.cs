using System.Security.Cryptography;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.DataProtection;

namespace AcmeHR.Infrastructure.Workflows;

// Webhook node URLs/headers are the only secret-shaped values a workflow graph can carry in this
// pass (no reusable credential vault yet - see the plan's "no credential vault" decision). Rather
// than a new table, they're encrypted in place inside GraphJson: Protect() runs on every save (the
// client always sends plaintext from its config form), Unprotect() runs on every load (both for
// returning the graph to its owner for editing, and for the executor at run time).
public class WorkflowGraphSecretProtector
{
    private readonly IDataProtector _protector;

    public WorkflowGraphSecretProtector(IDataProtectionProvider dataProtectionProvider)
    {
        _protector = dataProtectionProvider.CreateProtector("WorkflowWebhookSecrets");
    }

    public string Protect(string graphJson) => Transform(graphJson, _protector.Protect);

    public string Unprotect(string graphJson) => Transform(graphJson, value =>
    {
        try
        {
            return _protector.Unprotect(value);
        }
        catch (CryptographicException)
        {
            // Not actually protected (e.g. a hand-authored fixture in tests/manual API calls) -
            // return as-is rather than failing the whole graph load over one field.
            return value;
        }
    });

    private static string Transform(string graphJson, Func<string, string> transform)
    {
        var root = JsonNode.Parse(graphJson);
        if (root?["nodes"] is not JsonArray nodes)
        {
            return graphJson;
        }

        foreach (var node in nodes)
        {
            if (node?["type"]?.GetValue<string>() != "webhook" || node["data"] is not JsonObject data)
            {
                continue;
            }

            if (data["url"] is JsonValue urlValue && urlValue.TryGetValue<string>(out var url) && !string.IsNullOrEmpty(url))
            {
                data["url"] = transform(url);
            }

            if (data["headers"] is JsonObject headers)
            {
                foreach (var key in headers.Select(kv => kv.Key).ToList())
                {
                    if (headers[key] is JsonValue headerValue && headerValue.TryGetValue<string>(out var headerVal) && !string.IsNullOrEmpty(headerVal))
                    {
                        headers[key] = transform(headerVal);
                    }
                }
            }
        }

        return root.ToJsonString();
    }
}
