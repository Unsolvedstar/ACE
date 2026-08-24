import { useEffect, useRef, useState, type FormEvent } from "react";
import { Send, Sparkles, X } from "lucide-react";
import { getAgentMessages, getOrCreateConversation, sendAgentMessage } from "../../api/agents";
import { extractErrorMessage } from "../../api/client";
import { AgentMessageRole, type AgentMessageDto } from "../../types/agent";

const QUICK_PROMPTS = ["What's overdue?", "Show workload", "Standup summary"];

interface AgentChatPanelProps {
  boardId: string;
  onClose: () => void;
}

export function AgentChatPanel({ boardId, onClose }: AgentChatPanelProps) {
  const [messages, setMessages] = useState<AgentMessageDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([getOrCreateConversation(boardId), getAgentMessages(boardId)])
      .then(([, existingMessages]) => setMessages(existingMessages))
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setIsLoading(false));
  }, [boardId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendContent(content: string) {
    if (!content.trim() || isSending) return;
    setIsSending(true);
    setError(null);
    try {
      const result = await sendAgentMessage(boardId, { content });
      setMessages((prev) => [...prev, result.userMessage, result.assistantMessage]);
      setDraft("");
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void sendContent(draft);
  }

return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-slate-950/60">
      <div className="flex h-full w-full max-w-md flex-col border-l border-white/10 bg-[#3a3d40] shadow-2xl font-['Inter']">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#93d75f]" />
            <h3 className="text-sm font-semibold text-white">AI Assistant</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-3">
          {isLoading ? (
            <p className="text-sm text-white/40">Loading...</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-white/40">
              Ask me about this board — what's overdue, who's busy, or get a standup summary.
            </p>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === AgentMessageRole.User ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${
                    message.role === AgentMessageRole.User
                      ? "border border-[#6fbe44]/40 bg-[#6fbe44]/20 text-white"
                      : "bg-[#202325] text-white/90"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex flex-wrap gap-1.5 border-t border-white/10 px-4 pt-2">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={isSending}
              onClick={() => sendContent(prompt)}
              className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-medium text-white/60 transition-colors hover:bg-white/5 disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        {error && <p className="px-4 pt-2 text-sm text-[#e69c9c]">{error}</p>}

        <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask the assistant..."
            className="flex-1 rounded-lg border border-white/10 bg-[#202325] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#6fbe44] focus:outline-none focus:ring-2 focus:ring-[#6fbe44]/20"
          />
          <button
            type="submit"
            disabled={isSending || !draft.trim()}
            aria-label="Send"
            className="rounded-lg bg-[#6fbe44] p-2 text-[#131415] transition-colors hover:bg-[#93d75f] disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
