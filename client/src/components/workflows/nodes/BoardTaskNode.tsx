import { ClipboardList } from "lucide-react";
import type { NodeProps } from "@xyflow/react";
import { WorkflowNodeCard } from "./WorkflowNodeCard";
import type { WorkflowStepStatus } from "../../../types/workflow";

export function BoardTaskNode({ selected, data }: NodeProps) {
  const title = typeof data.title === "string" ? data.title : "";
  return (
    <WorkflowNodeCard
      icon={<ClipboardList className="h-4 w-4" />}
      label="Create Board Task"
      subtitle={title || "Configure a task"}
      accentColor="#8e6fd6"
      status={data.status as WorkflowStepStatus | undefined}
      selected={selected}
    />
  );
}
