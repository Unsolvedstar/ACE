import type { DragEvent } from "react";
import { Bell, Bot, ClipboardList, Code2, GitBranch, Webhook, type LucideIcon } from "lucide-react";
import { WorkflowNodeType } from "../../types/workflow";

export const WORKFLOW_NODE_DRAG_TYPE = "application/workflow-node-type";

interface PaletteItem {
  type: WorkflowNodeType;
  label: string;
  icon: LucideIcon;
  accent: string;
}

const PALETTE_ITEMS: PaletteItem[] = [
  { type: WorkflowNodeType.Notification, label: "Send Notification", icon: Bell, accent: "#f5a83c" },
  { type: WorkflowNodeType.Webhook, label: "Call Webhook", icon: Webhook, accent: "#4fa3e3" },
  { type: WorkflowNodeType.BoardTask, label: "Create Board Task", icon: ClipboardList, accent: "#8e6fd6" },
  { type: WorkflowNodeType.Condition, label: "Condition / Branch", icon: GitBranch, accent: "#e6c15c" },
  { type: WorkflowNodeType.Code, label: "Code", icon: Code2, accent: "#F5C518" },
  { type: WorkflowNodeType.AiAgent, label: "AI Agent", icon: Bot, accent: "#e37fb0" },
];

export function NodePalette() {
  function handleDragStart(event: DragEvent<HTMLDivElement>, nodeType: WorkflowNodeType) {
    event.dataTransfer.setData(WORKFLOW_NODE_DRAG_TYPE, nodeType);
    event.dataTransfer.effectAllowed = "move";
  }

  return (
    <div className="flex w-52 shrink-0 flex-col gap-2 rounded-xl border border-slate-200 bg-slate-100 p-3">
      <p className="px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Add a node</p>
      {PALETTE_ITEMS.map((item) => (
        <div
          key={item.type}
          draggable
          onDragStart={(event) => handleDragStart(event, item.type)}
          className="flex cursor-grab items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 transition-colors hover:border-slate-300 active:cursor-grabbing"
        >
          <item.icon className="h-3.5 w-3.5 shrink-0" style={{ color: item.accent }} />
          {item.label}
        </div>
      ))}
      <p className="mt-1 px-1 text-[10px] leading-relaxed text-slate-400">
        Drag a node onto the canvas, then connect it from the trigger.
      </p>
    </div>
  );
}
