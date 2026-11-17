using AcmeHR.Infrastructure.Agents;
using Xunit;

namespace AcmeHR.Infrastructure.Tests.Agents;

public class OllamaAiProviderTests
{
    // Tuned empirically against a real local llama3.2 - see OllamaAiProvider.LooksLikeActionRequest.
    // Small models are heavily biased toward calling *some* tool whenever tools are offered at
    // all, regardless of the system prompt, so this gate decides whether to offer tools in the
    // first place rather than trying to prompt the model out of that bias.
    [Theory]
    [InlineData("In one short sentence, what is the single task on this board about and when is it due?", false)]
    [InlineData("How many tasks are on this board in total?", false)]
    [InlineData("What's the status of the handrail task?", false)]
    [InlineData("Who is working on the gloves task?", false)]
    [InlineData("Is anything overdue?", false)]
    [InlineData("Hi there, how are you?", false)]
    [InlineData("Create a new task called 'Order replacement PPE gloves' due 2026-09-15.", true)]
    [InlineData("Can you move the handrail task to done?", true)]
    [InlineData("Please assign the gloves task to HR Admin.", true)]
    [InlineData("Change the due date on the handrail task to next Friday.", true)]
    [InlineData("Mark the handrail task complete.", true)]
    [InlineData("Reschedule the gloves task.", true)]
    [InlineData("Set the gloves task status to in progress.", true)]
    public void LooksLikeActionRequest_ClassifiesQuestionsAndActionsCorrectly(string message, bool expected)
    {
        Assert.Equal(expected, OllamaAiProvider.LooksLikeActionRequest(message));
    }
}
