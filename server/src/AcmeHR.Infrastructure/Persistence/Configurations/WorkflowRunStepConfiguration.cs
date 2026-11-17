using AcmeHR.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AcmeHR.Infrastructure.Persistence.Configurations;

public class WorkflowRunStepConfiguration : IEntityTypeConfiguration<WorkflowRunStep>
{
    public void Configure(EntityTypeBuilder<WorkflowRunStep> builder)
    {
        builder.ToTable("WorkflowRunSteps");

        builder.HasKey(s => s.Id);

        builder.Property(s => s.NodeId)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(s => s.NodeType)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(s => s.ErrorMessage)
            .HasMaxLength(2000);

        builder.Property(s => s.Status)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.HasOne(s => s.WorkflowRun)
            .WithMany(r => r.Steps)
            .HasForeignKey(s => s.WorkflowRunId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(s => new { s.WorkflowRunId, s.SequenceNumber });
    }
}
