using System.Text.Json;

namespace AcmeHR.Infrastructure.Workflows;

internal static class WorkflowNodeDataExtensions
{
    public static string? GetStringOrNull(this Dictionary<string, JsonElement> data, string key) =>
        data.TryGetValue(key, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() : null;

    public static string GetString(this Dictionary<string, JsonElement> data, string key) =>
        data.GetStringOrNull(key) ?? string.Empty;

    public static Guid? GetGuid(this Dictionary<string, JsonElement> data, string key)
    {
        var raw = data.GetStringOrNull(key);
        return raw is not null && Guid.TryParse(raw, out var guid) ? guid : null;
    }

    public static DateOnly? GetDateOnly(this Dictionary<string, JsonElement> data, string key)
    {
        var raw = data.GetStringOrNull(key);
        return raw is not null && DateOnly.TryParse(raw, out var date) ? date : null;
    }

    public static IReadOnlyDictionary<string, string>? GetStringDictionaryOrNull(this Dictionary<string, JsonElement> data, string key)
    {
        if (!data.TryGetValue(key, out var value) || value.ValueKind != JsonValueKind.Object)
        {
            return null;
        }

        var result = new Dictionary<string, string>();
        foreach (var property in value.EnumerateObject())
        {
            if (property.Value.ValueKind == JsonValueKind.String)
            {
                result[property.Name] = property.Value.GetString()!;
            }
        }

        return result;
    }
}
