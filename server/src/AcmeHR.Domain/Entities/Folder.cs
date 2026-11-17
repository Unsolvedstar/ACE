namespace AcmeHR.Domain.Entities;

public class Folder
{
    public Guid Id { get; set; }

    public Guid SpaceId { get; set; }
    public Space? Space { get; set; }

    public string Name { get; set; } = string.Empty;
    public bool IsArchived { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public ICollection<Board> Boards { get; set; } = new List<Board>();
}
