using AcmeHR.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AcmeHR.Infrastructure.Persistence.Configurations;

public class WorkflowRunConfiguration : IEntityTypeConfiguration<WorkflowRun>
{
    public void Configure(EntityTypeBuilder<WorkflowRun> builder)
    {
        builder.ToTable("WorkflowRuns");

        builder.HasKey(r => r.Id);

        builder.Property(r => r.ErrorMessage)
            .HasMaxLength(2000);

        builder.Property(r => r.Status)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.HasOne(r => r.Workflow)
            .WithMany(w => w.Runs)
            .HasForeignKey(r => r.WorkflowId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(r => r.TriggeredByEmployee)
            .WithMany()
            .HasForeignKey(r => r.TriggeredByEmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(r => new { r.WorkflowId, r.QueuedAtUtc });
    }
}
