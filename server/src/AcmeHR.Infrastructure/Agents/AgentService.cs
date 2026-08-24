using AcmeHR.Application.Agents;
using AcmeHR.Application.Common;
using AcmeHR.Domain.Entities;
using AcmeHR.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace AcmeHR.Infrastructure.Agents;

public class AgentService(ApplicationDbContext dbContext, IAiProvider aiProvider, IOptions<AiProviderSettings> aiProviderSettings) : IAgentService
{
    public async Task<Result<AgentConversationDto>> GetOrCreateConversationAsync(
        Guid boardId, Guid employeeId, CancellationToken cancellationToken = default)
    {
        var access = await CheckAccessAsync(boardId, employeeId, cancellationToken);
        if (access is null)
        {
            return Result<AgentConversationDto>.Failure("Board not found.");
        }
        if (!access.Value)
        {
            return Result<AgentConversationDto>.Failure("You are not a member of this board.");
        }

        var conversation = await GetOrCreateConversationEntityAsync(boardId, employeeId, cancellationToken);
        return Result<AgentConversationDto>.Success(ToDto(conversation));
    }

    public async Task<Result<IReadOnlyList<AgentMessageDto>>> GetMessagesAsync(
        Guid boardId, Guid employeeId, CancellationToken cancellationToken = default)
    {
        var access = await CheckAccessAsync(boardId, employeeId, cancellationToken);
        if (access is null)
        {
            return Result<IReadOnlyList<AgentMessageDto>>.Failure("Board not found.");
        }
        if (!access.Value)
        {
            return Result<IReadOnlyList<AgentMessageDto>>.Failure("You are not a member of this board.");
        }

        var conversation = await dbContext.AgentConversations
            .Include(c => c.Messages)
            .FirstOrDefaultAsync(c => c.BoardId == boardId && c.EmployeeId == employeeId, cancellationToken);

        if (conversation is null)
        {
            return Result<IReadOnlyList<AgentMessageDto>>.Success(Array.Empty<AgentMessageDto>());
        }

        var messages = conversation.Messages
            .OrderBy(m => m.CreatedAtUtc)
            .Select(ToDto)
            .ToList();

        return Result<IReadOnlyList<AgentMessageDto>>.Success(messages);
    }

    public async Task<Result<AgentChatTurnResultDto>> SendMessageAsync(
        Guid boardId, Guid employeeId, SendAgentMessageRequest request, CancellationToken cancellationToken = default)
    {
        var access = await CheckAccessAsync(boardId, employeeId, cancellationToken);
        if (access is null)
        {
            return Result<AgentChatTurnResultDto>.Failure("Board not found.");
        }
        if (!access.Value)
        {
            return Result<AgentChatTurnResultDto>.Failure("You are not a member of this board.");
        }

        var conversation = await GetOrCreateConversationEntityAsync(boardId, employeeId, cancellationToken);

        var maxHistory = aiProviderSettings.Value.MaxHistoryMessages;
        var history = await dbContext.AgentMessages
            .Where(m => m.ConversationId == conversation.Id)
            .OrderByDescending(m => m.CreatedAtUtc)
            .Take(maxHistory)
            .OrderBy(m => m.CreatedAtUtc)
            .Select(m => new AiChatMessage(m.Role == Domain.Enums.AgentMessageRole.User ? "user" : "assistant", m.Content))
            .ToListAsync(cancellationToken);

        var boardContext = await BuildBoardContextAsync(boardId, cancellationToken);

        var response = await aiProvider.GetChatResponseAsync(
            new AiChatRequest(boardContext, history, request.Content, ToolsEnabled: false), cancellationToken);

        var now = DateTime.UtcNow;
        var userMessage = new AgentMessage
        {
            Id = Guid.NewGuid(),
            ConversationId = conversation.Id,
            Role = Domain.Enums.AgentMessageRole.User,
            Content = request.Content,
            CreatedAtUtc = now,
        };
        var assistantMessage = new AgentMessage
        {
            Id = Guid.NewGuid(),
            ConversationId = conversation.Id,
            Role = Domain.Enums.AgentMessageRole.Assistant,
            Content = response.ReplyText,
            CreatedAtUtc = now,
        };

        dbContext.AgentMessages.Add(userMessage);
        dbContext.AgentMessages.Add(assistantMessage);
        conversation.LastMessageAtUtc = now;
        await dbContext.SaveChangesAsync(cancellationToken);

        return Result<AgentChatTurnResultDto>.Success(new AgentChatTurnResultDto(ToDto(userMessage), ToDto(assistantMessage)));
    }

    public async Task<Result<AgentSummaryDto>> GetStandupSummaryAsync(
        Guid boardId, Guid employeeId, DateOnly? sinceDate, CancellationToken cancellationToken = default)
    {
        var access = await CheckAccessAsync(boardId, employeeId, cancellationToken);
        if (access is null)
        {
            return Result<AgentSummaryDto>.Failure("Board not found.");
        }
        if (!access.Value)
        {
            return Result<AgentSummaryDto>.Failure("You are not a member of this board.");
        }

        var boardContext = await BuildBoardContextAsync(boardId, cancellationToken);
        var summary = await aiProvider.SummarizeAsync(new AiSummaryRequest(boardContext, sinceDate), cancellationToken);
        return Result<AgentSummaryDto>.Success(new AgentSummaryDto(summary));
    }

    private async Task<AgentConversation> GetOrCreateConversationEntityAsync(
        Guid boardId, Guid employeeId, CancellationToken cancellationToken)
    {
        var conversation = await dbContext.AgentConversations
            .FirstOrDefaultAsync(c => c.BoardId == boardId && c.EmployeeId == employeeId, cancellationToken);

        if (conversation is not null)
        {
            return conversation;
        }

        conversation = new AgentConversation
        {
            Id = Guid.NewGuid(),
            BoardId = boardId,
            EmployeeId = employeeId,
        };
        dbContext.AgentConversations.Add(conversation);
        await dbContext.SaveChangesAsync(cancellationToken);
        return conversation;
    }

    private async Task<AiBoardContext> BuildBoardContextAsync(Guid boardId, CancellationToken cancellationToken)
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

    private async Task<bool?> CheckAccessAsync(Guid boardId, Guid requesterId, CancellationToken cancellationToken)
    {
        var board = await dbContext.Boards.FirstOrDefaultAsync(b => b.Id == boardId, cancellationToken);
        if (board is null)
        {
            return null;
        }

        if (board.OwnerEmployeeId == requesterId)
        {
            return true;
        }

        return await dbContext.BoardMembers.AnyAsync(m => m.BoardId == boardId && m.EmployeeId == requesterId, cancellationToken);
    }

    private static AgentConversationDto ToDto(AgentConversation conversation) =>
        new(conversation.Id, conversation.BoardId, conversation.CreatedAtUtc, conversation.LastMessageAtUtc);

    private static AgentMessageDto ToDto(AgentMessage message) =>
        new(message.Id, message.Role, message.Content, message.CreatedAtUtc);
}
