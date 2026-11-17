using System.Text.Json;

namespace AcmeHR.Application.Workflows;

public record WorkflowGraphDto(List<WorkflowNodeDto> Nodes, List<WorkflowEdgeDto> Edges);

public record WorkflowNodeDto(
    string Id,
    string Type,
    WorkflowNodePositionDto Position,
    Dictionary<string, JsonElement> Data);

public record WorkflowNodePositionDto(double X, double Y);

public record WorkflowEdgeDto(
    string Id,
    string Source,
    string Target,
    string? SourceHandle);
