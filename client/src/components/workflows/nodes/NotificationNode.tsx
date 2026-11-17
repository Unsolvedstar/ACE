import { Bell } from "lucide-react";
import type { NodeProps } from "@xyflow/react";
import { WorkflowNodeCard } from "./WorkflowNodeCard";
import type { WorkflowStepStatus } from "../../../types/workflow";

export function NotificationNode({ selected, data }: NodeProps) {
  const message = typeof data.message === "string" ? data.message : "";
  return (
    <WorkflowNodeCard
      icon={<Bell className="h-4 w-4" />}
      label="Send Notification"
      subtitle={message || "Configure a message"}
      accentColor="#f5a83c"
      status={data.status as WorkflowStepStatus | undefined}
      selected={selected}
    />
  );
}
