using FluentValidation;

namespace AcmeHR.Application.Agents;

public class SendAgentMessageRequestValidator : AbstractValidator<SendAgentMessageRequest>
{
    public SendAgentMessageRequestValidator()
    {
        RuleFor(x => x.Content).NotEmpty().MaximumLength(4000);
    }
}

public class RejectAgentActionRequestValidator : AbstractValidator<RejectAgentActionRequest>
{
    public RejectAgentActionRequestValidator()
    {
        RuleFor(x => x.Reason).MaximumLength(500);
    }
}

public class UpdateAgentBoardSettingsRequestValidator : AbstractValidator<UpdateAgentBoardSettingsRequest>
{
}
