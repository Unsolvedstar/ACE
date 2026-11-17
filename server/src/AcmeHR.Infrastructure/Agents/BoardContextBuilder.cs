using AcmeHR.Application.Agents;
using AcmeHR.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace AcmeHR.Infrastructure.Agents;

// Shared by AgentService (chat) and AiAgentActionExecutor (workflow node) - both need the same
// board snapshot handed to IAiProvider, so the EF query lives in exactly one place.
public class BoardContextBuilder(ApplicationDbContext dbContext)
{
    public async Task<AiBoardContext> BuildAsync(Guid boardId, CancellationToken cancellationToken)
    {
        var board = await dbContext.Boards
            .Include(b => b.Members).ThenInclude(m => m.Employee)
            .Include(b => b.Tasks).ThenInclude(t => t.AssigneeEmployee)
            .FirstAsync(b => b.Id == boardId, cancellationToken);

        var members = board.Members
            .Select(m => new AiBoardMemberContext(m.EmployeeId, m.Employee!.FullName, m.Employee.JobTitle))
            .ToList();

        var tasks = board.Tasks
            .Select(t => new AiBoardTaskContext(
                t.Id,
                t.Title,
                t.Description,
                t.AssigneeEmployeeId,
                t.AssigneeEmployee?.FullName,
                t.Status.ToString(),
                t.DueDate,
                t.CreatedAtUtc,
                t.CompletedAtUtc))
            .ToList();

        return new AiBoardContext(board.Id, board.Name, members, tasks);
    }
}
