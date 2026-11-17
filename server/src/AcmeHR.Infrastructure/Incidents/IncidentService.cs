using AcmeHR.Application.Common;
using AcmeHR.Application.Incidents;
using AcmeHR.Application.Notifications;
using AcmeHR.Domain.Entities;
using AcmeHR.Domain.Enums;
using AcmeHR.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AcmeHR.Infrastructure.Incidents;

public class IncidentService(ApplicationDbContext dbContext, INotificationService notificationService) : IIncidentService
{
    public async Task<Result<IncidentReportDto>> SubmitAsync(
        Guid reporterEmployeeId, SubmitIncidentReportRequest request, CancellationToken cancellationToken = default)
    {
        var reporter = await dbContext.Employees.FindAsync([reporterEmployeeId], cancellationToken);
        if (reporter is null)
        {
            return Result<IncidentReportDto>.Failure("Employee profile not found.");
        }

        var entity = new IncidentReport
        {
            Id = Guid.NewGuid(),
            EmployeeId = reporterEmployeeId,
            Title = request.Title,
            Description = request.Description,
            Severity = request.Severity,
            Location = request.Location,
            OccurredAtUtc = request.OccurredAtUtc,
        };

        dbContext.IncidentReports.Add(entity);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<IncidentReportDto>.Success(ToDto(entity, reporter.FullName));
    }

    public async Task<IReadOnlyList<IncidentReportDto>> GetMyIncidentsAsync(
        Guid employeeId, CancellationToken cancellationToken = default)
    {
        var entities = await dbContext.IncidentReports
            .Include(i => i.Employee)
            .Where(i => i.EmployeeId == employeeId)
            .OrderByDescending(i => i.OccurredAtUtc)
            .ToListAsync(cancellationToken);

        return entities.Select(i => ToDto(i, i.Employee!.FullName)).ToList();
    }

    public async Task<IReadOnlyList<IncidentReportDto>> GetAllIncidentsAsync(CancellationToken cancellationToken = default)
    {
        // Reported/UnderInvestigation (still actionable) surface before Closed ones, most
        // recent first within each group.
        var entities = await dbContext.IncidentReports
            .Include(i => i.Employee)
            .OrderBy(i => i.Status)
            .ThenByDescending(i => i.OccurredAtUtc)
            .ToListAsync(cancellationToken);

        return entities.Select(i => ToDto(i, i.Employee!.FullName)).ToList();
    }

    public async Task<Result<IncidentReportDto>> UpdateStatusAsync(
        Guid incidentId, Guid reviewerId, UpdateIncidentStatusRequest request, CancellationToken cancellationToken = default)
    {
        var entity = await dbContext.IncidentReports
            .Include(i => i.Employee)
            .FirstOrDefaultAsync(i => i.Id == incidentId, cancellationToken);

        if (entity is null)
        {
            return Result<IncidentReportDto>.Failure("Incident report not found.");
        }

        // Status transitions must move strictly forward (Reported -> UnderInvestigation ->
        // Closed) - no reopening a closed incident and no repeating the current status -
        // but skipping straight to Closed from Reported is fine.
        if (request.Status <= entity.Status)
        {
            return Result<IncidentReportDto>.Failure(
                $"Cannot move an incident from {entity.Status} back to or repeat {request.Status}.");
        }

        entity.Status = request.Status;
        entity.ReviewerId = reviewerId;
        entity.ReviewedAtUtc = DateTime.UtcNow;
        entity.ReviewNotes = request.ReviewNotes;

        await dbContext.SaveChangesAsync(cancellationToken);

        await notificationService.CreateAsync(
            entity.EmployeeId,
            $"Your incident report \"{entity.Title}\" is now {IncidentStatusLabel(entity.Status)}.",
            "/incidents",
            cancellationToken);

        return Result<IncidentReportDto>.Success(ToDto(entity, entity.Employee!.FullName));
    }

    private static string IncidentStatusLabel(IncidentStatus status) => status switch
    {
        IncidentStatus.UnderInvestigation => "under investigation",
        IncidentStatus.Closed => "closed",
        _ => status.ToString(),
    };

    private static IncidentReportDto ToDto(IncidentReport entity, string employeeName) => new(
        entity.Id,
        entity.EmployeeId,
        employeeName,
        entity.Title,
        entity.Description,
        entity.Severity,
        entity.Location,
        entity.OccurredAtUtc,
        entity.Status,
        entity.CreatedAtUtc,
        entity.ReviewedAtUtc,
        entity.ReviewNotes);
}
