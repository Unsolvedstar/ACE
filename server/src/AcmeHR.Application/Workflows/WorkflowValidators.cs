using System.Text.Json;
using FluentValidation;

namespace AcmeHR.Application.Workflows;

public class CreateWorkflowRequestValidator : AbstractValidator<CreateWorkflowRequest>
{
    public CreateWorkflowRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Description).MaximumLength(1000);
    }
}

public class UpdateWorkflowRequestValidator : AbstractValidator<UpdateWorkflowRequest>
{
    public UpdateWorkflowRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Description).MaximumLength(1000);
        RuleFor(x => x.GraphJson).NotEmpty().Must(BeValidJson).WithMessage("GraphJson must be valid JSON.");
    }

    private static bool BeValidJson(string graphJson)
    {
        try
        {
            using var _ = JsonDocument.Parse(graphJson);
            return true;
        }
        catch (JsonException)
        {
            return false;
        }
    }
}
