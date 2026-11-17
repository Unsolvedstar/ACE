import { GitBranch } from "lucide-react";
import type { NodeProps } from "@xyflow/react";
import { WorkflowNodeCard } from "./WorkflowNodeCard";
import { ConditionOperatorLabels, type ConditionOperator, type WorkflowStepStatus } from "../../../types/workflow";

export function ConditionNode({ selected, data }: NodeProps) {
  const field = typeof data.field === "string" ? data.field : "";
  const operator = typeof data.operator === "string" ? (data.operator as ConditionOperator) : undefined;
  const value = typeof data.value === "string" ? data.value : "";
  const subtitle = field ? `${field} ${operator ? ConditionOperatorLabels[operator] : "?"} ${value}` : "Configure a condition";

  return (
    <WorkflowNodeCard
      icon={<GitBranch className="h-4 w-4" />}
      label="Condition / Branch"
      subtitle={subtitle}
      accentColor="#e6c15c"
      status={data.status as WorkflowStepStatus | undefined}
      selected={selected}
      sourceHandles={[
        { id: "true", label: "True" },
        { id: "false", label: "False" },
      ]}
    />
  );
}
