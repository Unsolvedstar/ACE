using AcmeHR.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AcmeHR.Infrastructure.Persistence.Configurations;

public class AgentActionAuditConfiguration : IEntityTypeConfiguration<AgentActionAudit>
{
    public void Configure(EntityTypeBuilder<AgentActionAudit> builder)
    {
        builder.ToTable("AgentActionAudits");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.ArgumentsJson).IsRequired();
        builder.Property(a => a.Summary).IsRequired().HasMaxLength(500);
        builder.Property(a => a.ResultDetail).HasMaxLength(1000);

        builder.Property(a => a.ToolName).HasConversion<string>().HasMaxLength(30);
        builder.Property(a => a.Status).HasConversion<string>().HasMaxLength(20);

        builder.HasOne(a => a.Board)
            .WithMany()
            .HasForeignKey(a => a.BoardId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(a => a.Conversation)
            .WithMany()
            .HasForeignKey(a => a.ConversationId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(a => a.RequestedByEmployee)
            .WithMany()
            .HasForeignKey(a => a.RequestedByEmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(a => a.DecidedByEmployee)
            .WithMany()
            .HasForeignKey(a => a.DecidedByEmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(a => a.TargetTask)
            .WithMany()
            .HasForeignKey(a => a.TargetTaskId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasIndex(a => new { a.BoardId, a.Status });
    }
}
