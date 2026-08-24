using FluentValidation;

namespace AcmeHR.Application.Agents;

public class SendAgentMessageRequestValidator : AbstractValidator<SendAgentMessageRequest>
{
    public SendAgentMessageRequestValidator()
    {
        RuleFor(x => x.Content).NotEmpty().MaximumLength(4000);
    }
}
