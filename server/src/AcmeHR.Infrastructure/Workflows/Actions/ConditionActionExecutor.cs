using System.Text.Json;
using AcmeHR.Application.Common;
using AcmeHR.Application.Workflows;

namespace AcmeHR.Infrastructure.Workflows.Actions;

internal static class ConditionActionExecutor
{
    public static Result<string> Execute(WorkflowNodeDto node, WorkflowExecutionContext context)
    {
        var field = node.Data.GetStringOrNull("field");
        var op = node.Data.GetStringOrNull("operator");
        var expected = node.Data.GetStringOrNull("value") ?? string.Empty;

        if (string.IsNullOrWhiteSpace(field) || string.IsNullOrWhiteSpace(op))
        {
            return Result<string>.Failure("Condition node is missing a field or operator.");
        }

        var actual = context.Resolve(field)?.ToString();

        bool matched;
        switch (op)
        {
            case "equals":
                matched = string.Equals(actual, expected, StringComparison.OrdinalIgnoreCase);
                break;
            case "notEquals":
                matched = !string.Equals(actual, expected, StringComparison.OrdinalIgnoreCase);
                break;
            case "contains":
                matched = actual is not null && actual.Contains(expected, StringComparison.OrdinalIgnoreCase);
                break;
            case "greaterThan":
            case "lessThan":
                if (actual is null || !double.TryParse(actual, out var actualNum) || !double.TryParse(expected, out var expectedNum))
                {
                    return Result<string>.Failure($"Field \"{field}\" is missing or not numeric for a \"{op}\" comparison.");
                }
                matched = op == "greaterThan" ? actualNum > expectedNum : actualNum < expectedNum;
                break;
            default:
                return Result<string>.Failure($"Unknown condition operator \"{op}\".");
        }

        return Result<string>.Success(JsonSerializer.Serialize(new { result = matched }));
    }
}
