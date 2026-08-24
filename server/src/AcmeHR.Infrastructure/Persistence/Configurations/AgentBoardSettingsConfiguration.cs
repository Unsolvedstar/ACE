using AcmeHR.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AcmeHR.Infrastructure.Persistence.Configurations;

public class AgentBoardSettingsConfiguration : IEntityTypeConfiguration<AgentBoardSettings>
{
    public void Configure(EntityTypeBuilder<AgentBoardSettings> builder)
    {
        builder.ToTable("AgentBoardSettings");

        builder.HasKey(s => s.Id);

        builder.HasOne(s => s.Board)
            .WithMany()
            .HasForeignKey(s => s.BoardId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(s => s.UpdatedByEmployee)
            .WithMany()
            .HasForeignKey(s => s.UpdatedByEmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(s => s.BoardId).IsUnique();
    }
}
