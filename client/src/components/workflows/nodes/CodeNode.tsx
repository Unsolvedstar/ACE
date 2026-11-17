import { Code2 } from "lucide-react";
import type { NodeProps } from "@xyflow/react";
import { WorkflowNodeCard } from "./WorkflowNodeCard";
import type { WorkflowStepStatus } from "../../../types/workflow";

export function CodeNode({ selected, data }: NodeProps) {
  const hasScript = typeof data.code === "string" && data.code.trim().length > 0;
  return (
    <WorkflowNodeCard
      icon={<Code2 className="h-4 w-4" />}
      label="Code"
      subtitle={hasScript ? "TypeScript script" : "Write a script"}
      accentColor="#F5C518"
      status={data.status as WorkflowStepStatus | undefined}
      selected={selected}
    />
  );
}
