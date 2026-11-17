using AcmeHR.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AcmeHR.Infrastructure.Persistence.Configurations;

public class FolderConfiguration : IEntityTypeConfiguration<Folder>
{
    public void Configure(EntityTypeBuilder<Folder> builder)
    {
        builder.ToTable("Folders");

        builder.HasKey(f => f.Id);

        builder.Property(f => f.Name)
            .IsRequired()
            .HasMaxLength(150);

        builder.HasOne(f => f.Space)
            .WithMany(s => s.Folders)
            .HasForeignKey(f => f.SpaceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(f => f.SpaceId);
    }
}
