namespace AcmeHR.Domain.Entities;

public class Space
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    public Guid OwnerEmployeeId { get; set; }
    public Employee? OwnerEmployee { get; set; }

    public Guid? SiteId { get; set; }
    public Site? Site { get; set; }

    public bool IsArchived { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public ICollection<SpaceMember> Members { get; set; } = new List<SpaceMember>();
    public ICollection<Folder> Folders { get; set; } = new List<Folder>();
    public ICollection<Board> Boards { get; set; } = new List<Board>();
}
