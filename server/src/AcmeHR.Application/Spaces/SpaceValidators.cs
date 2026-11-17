using FluentValidation;

namespace AcmeHR.Application.Spaces;

public class CreateSpaceRequestValidator : AbstractValidator<CreateSpaceRequest>
{
    public CreateSpaceRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Description).MaximumLength(1000);
        RuleFor(x => x.InitialMemberEmployeeIds).NotNull();
    }
}

public class UpdateSpaceRequestValidator : AbstractValidator<UpdateSpaceRequest>
{
    public UpdateSpaceRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Description).MaximumLength(1000);
    }
}

public class AddSpaceMemberRequestValidator : AbstractValidator<AddSpaceMemberRequest>
{
    public AddSpaceMemberRequestValidator()
    {
        RuleFor(x => x.EmployeeId).NotEmpty();
    }
}
