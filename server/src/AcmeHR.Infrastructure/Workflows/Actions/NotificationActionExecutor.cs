using AcmeHR.Application.Common;
using AcmeHR.Application.Notifications;
using AcmeHR.Application.Workflows;

namespace AcmeHR.Infrastructure.Workflows.Actions;

internal static class NotificationActionExecutor
{
    public static async Task<Result<string>> ExecuteAsync(
        WorkflowNodeDto node, INotificationService notificationService, CancellationToken cancellationToken)
    {
        var recipientEmployeeId = node.Data.GetGuid("recipientEmployeeId");
        var message = node.Data.GetStringOrNull("message");

        if (recipientEmployeeId is null || string.IsNullOrWhiteSpace(message))
        {
            return Result<string>.Failure("Notification node is missing a recipient or message.");
        }

        var link = node.Data.GetStringOrNull("link");
        await notificationService.CreateAsync(recipientEmployeeId.Value, message, link, cancellationToken);

        return Result<string>.Success("""{"sent":true}""");
    }
}
