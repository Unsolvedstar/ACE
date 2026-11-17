using System.Text.Json;
using System.Text.Json.Nodes;

namespace AcmeHR.Infrastructure.Workflows;

// Flat dotted-path context ("trigger.triggeredByEmployeeId", "steps.webhook1.statusCode") that
// condition nodes resolve their field against. Built up as the graph walk proceeds: the trigger
// payload is set once at the start, and each node's OutputJson is folded in as it completes.
public class WorkflowExecutionContext
{
    private readonly JsonObject _root = new();

    public void SetTrigger(object triggerPayload)
    {
        _root["trigger"] = JsonSerializer.SerializeToNode(triggerPayload);
    }

    public void SetStepOutput(string nodeId, string? outputJson)
    {
        if (_root["steps"] is not JsonObject steps)
        {
            steps = new JsonObject();
            _root["steps"] = steps;
        }

        steps[nodeId] = outputJson is null ? null : JsonNode.Parse(outputJson);
    }

    public JsonNode? Resolve(string dottedPath)
    {
        JsonNode? current = _root;
        foreach (var segment in dottedPath.Split('.', StringSplitOptions.RemoveEmptyEntries))
        {
            if (current is not JsonObject obj || !obj.TryGetPropertyValue(segment, out current))
            {
                return null;
            }
        }

        return current;
    }
}
