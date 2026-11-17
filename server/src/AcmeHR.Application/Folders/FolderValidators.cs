using FluentValidation;

namespace AcmeHR.Application.Folders;

public class CreateFolderRequestValidator : AbstractValidator<CreateFolderRequest>
{
    public CreateFolderRequestValidator()
    {
        RuleFor(x => x.SpaceId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
    }
}

public class UpdateFolderRequestValidator : AbstractValidator<UpdateFolderRequest>
{
    public UpdateFolderRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
    }
}
