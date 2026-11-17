using AcmeHR.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AcmeHR.Infrastructure.Persistence.Configurations;

public class SpaceMemberConfiguration : IEntityTypeConfiguration<SpaceMember>
{
    public void Configure(EntityTypeBuilder<SpaceMember> builder)
    {
        builder.ToTable("SpaceMembers");

        builder.HasKey(m => m.Id);

        builder.HasOne(m => m.Space)
            .WithMany(s => s.Members)
            .HasForeignKey(m => m.SpaceId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(m => m.Employee)
            .WithMany()
            .HasForeignKey(m => m.EmployeeId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(m => new { m.SpaceId, m.EmployeeId }).IsUnique();
    }
}
