using AcmeHR.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AcmeHR.Infrastructure.Persistence.Configurations;

public class WorkflowConfiguration : IEntityTypeConfiguration<Workflow>
{
    public void Configure(EntityTypeBuilder<Workflow> builder)
    {
        builder.ToTable("Workflows");

        builder.HasKey(w => w.Id);

        builder.Property(w => w.Name)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(w => w.Description)
            .HasMaxLength(1000);

        builder.Property(w => w.GraphJson)
            .IsRequired();

        builder.HasOne(w => w.OwnerEmployee)
            .WithMany()
            .HasForeignKey(w => w.OwnerEmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(w => w.OwnerEmployeeId);
    }
}
