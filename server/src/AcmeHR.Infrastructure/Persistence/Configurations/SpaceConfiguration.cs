using AcmeHR.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AcmeHR.Infrastructure.Persistence.Configurations;

public class SpaceConfiguration : IEntityTypeConfiguration<Space>
{
    public void Configure(EntityTypeBuilder<Space> builder)
    {
        builder.ToTable("Spaces");

        builder.HasKey(s => s.Id);

        builder.Property(s => s.Name)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(s => s.Description)
            .HasMaxLength(1000);

        builder.HasOne(s => s.OwnerEmployee)
            .WithMany()
            .HasForeignKey(s => s.OwnerEmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(s => s.Site)
            .WithMany()
            .HasForeignKey(s => s.SiteId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(s => s.OwnerEmployeeId);
    }
}
