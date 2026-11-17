import type { ReactNode } from "react";
import { X } from "lucide-react";
import type { Node } from "@xyflow/react";
import { ConditionOperator, ConditionOperatorLabels, WorkflowNodeType } from "../../types/workflow";
import { CodeScriptEditor } from "./CodeScriptEditor";

const inputClasses =
  "rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/15";

interface NodeConfigPanelProps {
  node: Node | null;
  onChange: (nodeId: string, data: Record<string, unknown>) => void;
  onClose: () => void;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function labelFor(type?: string): string {
  switch (type) {
    case WorkflowNodeType.ManualTrigger:
      return "Manual Trigger";
    case WorkflowNodeType.Notification:
      return "Send Notification";
    case WorkflowNodeType.Webhook:
      return "Call Webhook";
    case WorkflowNodeType.BoardTask:
      return "Create Board Task";
    case WorkflowNodeType.Condition:
      return "Condition / Branch";
    case WorkflowNodeType.Code:
      return "Code";
    case WorkflowNodeType.AiAgent:
      return "AI Agent";
    default:
      return "Node";
  }
}

function ConfigField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-[11px] font-medium text-slate-600">
      {label}
      {children}
    </label>
  );
}

export function NodeConfigPanel({ node, onChange, onClose }: NodeConfigPanelProps) {
  if (!node) {
    return (
      <div className="flex w-72 shrink-0 flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 p-4 text-center text-xs text-slate-500">
        Select a node to configure it.
      </div>
    );
  }

  const data = node.data as Record<string, unknown>;
  const set = (key: string, value: unknown) => onChange(node.id, { ...data, [key]: value });
  const setMany = (updates: Record<string, unknown>) => onChange(node.id, { ...data, ...updates });

  return (
    <div className="flex w-72 shrink-0 flex-col gap-3 overflow-y-auto rounded-xl border border-slate-200 bg-slate-100 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{labelFor(node.type)}</p>
        <button type="button" onClick={onClose} className="text-slate-400 transition-colors hover:text-slate-600" aria-label="Close">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {node.type === WorkflowNodeType.ManualTrigger && (
        <p className="text-xs leading-relaxed text-slate-500">
          This node starts the workflow when you click "Run now". It has no configuration.
        </p>
      )}

      {node.type === WorkflowNodeType.Notification && (
        <>
          <ConfigField label="Recipient employee ID">
            <input
              className={inputClasses}
              value={str(data.recipientEmployeeId)}
              onChange={(e) => set("recipientEmployeeId", e.target.value)}
              placeholder="employee GUID"
            />
          </ConfigField>
          <ConfigField label="Message">
            <textarea rows={3} className={inputClasses} value={str(data.message)} onChange={(e) => set("message", e.target.value)} />
          </ConfigField>
          <ConfigField label="Link (optional)">
            <input className={inputClasses} value={str(data.link)} onChange={(e) => set("link", e.target.value)} placeholder="/leave" />
          </ConfigField>
        </>
      )}

      {node.type === WorkflowNodeType.Webhook && (
        <>
          <ConfigField label="Target URL">
            <input
              className={inputClasses}
              value={str(data.url)}
              onChange={(e) => set("url", e.target.value)}
              placeholder="https://example.com/hook"
            />
          </ConfigField>
          <ConfigField label="Payload (JSON)">
            <textarea
              rows={4}
              className={`${inputClasses} font-mono`}
              value={str(data.payloadTemplate) || "{}"}
              onChange={(e) => set("payloadTemplate", e.target.value)}
            />
          </ConfigField>
        </>
      )}

      {node.type === WorkflowNodeType.BoardTask && (
        <>
          <ConfigField label="Board ID">
            <input
              className={inputClasses}
              value={str(data.boardId)}
              onChange={(e) => set("boardId", e.target.value)}
              placeholder="board GUID"
            />
          </ConfigField>
          <ConfigField label="Task title">
            <input className={inputClasses} value={str(data.title)} onChange={(e) => set("title", e.target.value)} />
          </ConfigField>
          <ConfigField label="Description (optional)">
            <textarea rows={2} className={inputClasses} value={str(data.description)} onChange={(e) => set("description", e.target.value)} />
          </ConfigField>
          <ConfigField label="Assignee employee ID (optional)">
            <input
              className={inputClasses}
              value={str(data.assigneeEmployeeId)}
              onChange={(e) => set("assigneeEmployeeId", e.target.value)}
            />
          </ConfigField>
        </>
      )}

      {node.type === WorkflowNodeType.Condition && (
        <>
          <ConfigField label="Field (dotted path)">
            <input
              className={inputClasses}
              value={str(data.field)}
              onChange={(e) => set("field", e.target.value)}
              placeholder="trigger.triggeredByEmployeeId"
            />
          </ConfigField>
          <ConfigField label="Operator">
            <select
              className={inputClasses}
              value={str(data.operator) || ConditionOperator.Equals}
              onChange={(e) => set("operator", e.target.value)}
            >
              {Object.entries(ConditionOperatorLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </ConfigField>
          <ConfigField label="Value">
            <input className={inputClasses} value={str(data.value)} onChange={(e) => set("value", e.target.value)} />
          </ConfigField>
        </>
      )}

      {node.type === WorkflowNodeType.Code && (
        <>
          <p className="text-[11px] leading-relaxed text-slate-500">
            TypeScript, compiled in your browser. Return a JSON-serializable value; read prior data
            via the <code>trigger</code> and <code>steps</code> globals.
          </p>
          <ConfigField label="Script">
            <CodeScriptEditor
              source={str(data.codeTs) || str(data.code)}
              onChange={(codeTs, code) => setMany({ codeTs, code })}
            />
          </ConfigField>
        </>
      )}

      {node.type === WorkflowNodeType.AiAgent && (
        <>
          <ConfigField label="Board ID">
            <input
              className={inputClasses}
              value={str(data.boardId)}
              onChange={(e) => set("boardId", e.target.value)}
              placeholder="board GUID"
            />
          </ConfigField>
          <ConfigField label="Instruction">
            <textarea
              rows={4}
              className={inputClasses}
              value={str(data.instruction)}
              onChange={(e) => set("instruction", e.target.value)}
              placeholder='e.g. "Create a task to review the incident report"'
            />
          </ConfigField>
          <p className="text-[11px] leading-relaxed text-slate-500">
            Runs automatically when this node executes - no chat, no approval needed. Only the
            four actions the assistant can already do (create task, change status, reassign,
            change deadline) are available.
          </p>
        </>
      )}
    </div>
  );
}
