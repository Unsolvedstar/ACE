using Microsoft.AspNetCore.Identity;

namespace AcmeHR.Infrastructure.Identity;

public class AppUser : IdentityUser<Guid>
{
    public Guid EmployeeId { get; set; }
}
