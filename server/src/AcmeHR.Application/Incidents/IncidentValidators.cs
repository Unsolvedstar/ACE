using FluentValidation;

namespace AcmeHR.Application.Incidents;

public class SubmitIncidentReportRequestValidator : AbstractValidator<SubmitIncidentReportRequest>
{
    public SubmitIncidentReportRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Description).NotEmpty().MaximumLength(2000);
        RuleFor(x => x.Severity).IsInEnum();
        RuleFor(x => x.Location).NotEmpty().MaximumLength(200);
        // Small buffer for clock skew between client and server rather than a hard "now" cutoff.
        RuleFor(x => x.OccurredAtUtc).LessThanOrEqualTo(_ => DateTime.UtcNow.AddMinutes(5));
    }
}

public class UpdateIncidentStatusRequestValidator : AbstractValidator<UpdateIncidentStatusRequest>
{
    public UpdateIncidentStatusRequestValidator()
    {
        RuleFor(x => x.Status).IsInEnum();
        RuleFor(x => x.ReviewNotes).MaximumLength(1000);
    }
}
