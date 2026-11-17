import { Zap } from "lucide-react";
import type { NodeProps } from "@xyflow/react";
import { WorkflowNodeCard } from "./WorkflowNodeCard";
import type { WorkflowStepStatus } from "../../../types/workflow";

export function TriggerNode({ selected, data }: NodeProps) {
  return (
    <WorkflowNodeCard
      icon={<Zap className="h-4 w-4" />}
      label="Manual Trigger"
      subtitle="Starts when you click Run now"
      accentColor="#F5C518"
      status={data.status as WorkflowStepStatus | undefined}
      selected={selected}
      showTargetHandle={false}
    />
  );
}
