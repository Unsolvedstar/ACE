using System.Text.Json;
using AcmeHR.Application.Common;
using AcmeHR.Application.Workflows;
using Jint;
using Jint.Runtime;

namespace AcmeHR.Infrastructure.Workflows.Actions;

// Runs a workflow author's own JavaScript (compiled client-side from TypeScript - see
// NodeConfigPanel.tsx - so the server only ever sees plain JS) via Jint, a pure-C# ECMAScript
// interpreter. Never call Options.AllowClr() and never SetValue a live CLR object: the script
// only gets "trigger"/"steps" as plain dictionaries/lists/primitives, so it has no
// filesystem/network/process access no matter what it does.
internal static class CodeActionExecutor
{
    private static readonly TimeSpan ExecutionTimeout = TimeSpan.FromSeconds(2);

    public static Result<string> Execute(WorkflowNodeDto node, WorkflowExecutionContext context)
    {
        var code = node.Data.GetStringOrNull("code");
        if (string.IsNullOrWhiteSpace(code))
        {
            return Result<string>.Failure("Code node has no script.");
        }

        var engine = new Engine(options => options
            .LimitRecursion(200)
            .TimeoutInterval(ExecutionTimeout)
            .LimitMemory(64_000_000)
            .MaxStatements(100_000));

        try
        {
            engine.SetValue("trigger", ResolveAsClr(context, "trigger"));
            engine.SetValue("steps", ResolveAsClr(context, "steps"));

            var result = engine.Evaluate($"(function() {{\n{code}\n}})()");
            var output = result.IsUndefined() ? null : result.ToObject();

            return Result<string>.Success(JsonSerializer.Serialize(new { output }));
        }
        catch (TimeoutException)
        {
            return Result<string>.Failure("Script exceeded its 2 second execution limit.");
        }
        catch (JavaScriptException ex)
        {
            return Result<string>.Failure($"Script error: {ex.Message}");
        }
        catch (Exception ex)
        {
            return Result<string>.Failure($"Script error: {ex.Message}");
        }
    }

    private static object? ResolveAsClr(WorkflowExecutionContext context, string rootKey)
    {
        var node = context.Resolve(rootKey);
        if (node is null)
        {
            return new Dictionary<string, object?>();
        }

        using var doc = JsonDocument.Parse(node.ToJsonString());
        return ToClrValue(doc.RootElement);
    }

    private static object? ToClrValue(JsonElement element) => element.ValueKind switch
    {
        JsonValueKind.Object => element.EnumerateObject().ToDictionary(p => p.Name, p => ToClrValue(p.Value)),
        JsonValueKind.Array => element.EnumerateArray().Select(ToClrValue).ToList(),
        JsonValueKind.String => element.GetString(),
        JsonValueKind.Number => element.TryGetInt64(out var l) ? l : element.GetDouble(),
        JsonValueKind.True => true,
        JsonValueKind.False => false,
        _ => null,
    };
}
