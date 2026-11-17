import { Bot } from "lucide-react";
import type { NodeProps } from "@xyflow/react";
import { WorkflowNodeCard } from "./WorkflowNodeCard";
import type { WorkflowStepStatus } from "../../../types/workflow";

export function AiAgentNode({ selected, data }: NodeProps) {
  const instruction = typeof data.instruction === "string" ? data.instruction : "";
  return (
    <WorkflowNodeCard
      icon={<Bot className="h-4 w-4" />}
      label="AI Agent"
      subtitle={instruction || "Configure an instruction"}
      accentColor="#e37fb0"
      status={data.status as WorkflowStepStatus | undefined}
      selected={selected}
    />
  );
}
