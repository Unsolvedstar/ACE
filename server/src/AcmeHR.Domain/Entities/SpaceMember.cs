namespace AcmeHR.Domain.Entities;

public class SpaceMember
{
    public Guid Id { get; set; }

    public Guid SpaceId { get; set; }
    public Space? Space { get; set; }

    public Guid EmployeeId { get; set; }
    public Employee? Employee { get; set; }

    public DateTime AddedAtUtc { get; set; } = DateTime.UtcNow;
}
