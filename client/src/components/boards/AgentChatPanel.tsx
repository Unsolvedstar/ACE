import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Send, Sparkles, X } from "lucide-react";
import { approveAgentAction, getAgentActions, rejectAgentAction } from "../../api/agentActions";
import { getAgentMessages, getOrCreateConversation, sendAgentMessage } from "../../api/agents";
import { extractErrorMessage } from "../../api/client";
import { AgentActionStatus, AgentMessageRole, type AgentActionAuditDto, type AgentMessageDto } from "../../types/agent";
import { AgentActionCard } from "./AgentActionCard";

const QUICK_PROMPTS = ["What's overdue?", "Show workload", "Standup summary"];

interface AgentChatPanelProps {
  boardId: string;
  canDecideActions: boolean;
  refreshSignal?: number;
  onClose: () => void;
}

export function AgentChatPanel({ boardId, canDecideActions, refreshSignal, onClose }: AgentChatPanelProps) {
  const [messages, setMessages] = useState<AgentMessageDto[]>([]);
  const [turnActions, setTurnActions] = useState<Record<string, AgentActionAuditDto[]>>({});
  const [pendingActions, setPendingActions] = useState<AgentActionAuditDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [busyActionId, setBusyActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const loadPendingActions = useCallback(async () => {
    try {
      setPendingActions(await getAgentActions(boardId, AgentActionStatus.Proposed));
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  }, [boardId]);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([getOrCreateConversation(boardId), getAgentMessages(boardId), getAgentActions(boardId, AgentActionStatus.Proposed)])
      .then(([, existingMessages, pending]) => {
        setMessages(existingMessages);
        setPendingActions(pending);
      })
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setIsLoading(false));
  }, [boardId]);

  useEffect(() => {
    if (refreshSignal !== undefined) {
      void loadPendingActions();
    }
  }, [refreshSignal, loadPendingActions]);

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
      if (result.proposedActions.length > 0) {
        setTurnActions((prev) => ({ ...prev, [result.assistantMessage.id]: result.proposedActions }));
        const stillPending = result.proposedActions.filter((a) => a.status === AgentActionStatus.Proposed);
        if (stillPending.length > 0) {
          setPendingActions((prev) => [...prev, ...stillPending]);
        }
      }
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

  function applyActionUpdate(updated: AgentActionAuditDto) {
    setPendingActions((prev) => prev.filter((a) => a.id !== updated.id));
    setTurnActions((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        next[key] = next[key].map((a) => (a.id === updated.id ? updated : a));
      }
      return next;
    });
  }

  async function handleApprove(actionId: string) {
    setBusyActionId(actionId);
    try {
      applyActionUpdate(await approveAgentAction(boardId, actionId));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusyActionId(null);
    }
  }

  async function handleReject(actionId: string, reason?: string) {
    setBusyActionId(actionId);
    try {
      applyActionUpdate(await rejectAgentAction(boardId, actionId, { reason }));
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusyActionId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-ink-950/60">
      <div className="flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl font-['Inter']">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold-700" />
            <h3 className="text-sm font-semibold text-slate-900">AI Assistant</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {pendingActions.length > 0 && (
          <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Pending actions ({pendingActions.length})
            </span>
            {pendingActions.map((action) => (
              <AgentActionCard
                key={action.id}
                action={action}
                canDecide={canDecideActions}
                onApprove={handleApprove}
                onReject={handleReject}
                isBusy={busyActionId === action.id}
              />
            ))}
          </div>
        )}

        <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-3">
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-slate-500">
              Ask me about this board — what's overdue, who's busy, get a standup summary, or ask me to create or
              update a task.
            </p>
          ) : (
            messages.map((message) => (
              <div key={message.id} className="flex flex-col gap-2">
                <div
                  className={`flex ${message.role === AgentMessageRole.User ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${
                      message.role === AgentMessageRole.User
                        ? "border border-gold-500/40 bg-gold-500/10 text-slate-900"
                        : "bg-slate-50 text-slate-800"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
                {turnActions[message.id]?.map((action) => (
                  <AgentActionCard
                    key={action.id}
                    action={action}
                    canDecide={canDecideActions}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    isBusy={busyActionId === action.id}
                  />
                ))}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex flex-wrap gap-1.5 border-t border-slate-200 px-4 pt-2">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={isSending}
              onClick={() => sendContent(prompt)}
              className="rounded-full border border-slate-300 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        {error && <p className="px-4 pt-2 text-sm text-red-600">{error}</p>}

        <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask the assistant..."
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/15"
          />
          <button
            type="submit"
            disabled={isSending || !draft.trim()}
            aria-label="Send"
            className="rounded-lg bg-gold-600 p-2 text-white transition-colors hover:bg-gold-500 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
