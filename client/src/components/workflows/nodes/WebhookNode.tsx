import { Webhook } from "lucide-react";
import type { NodeProps } from "@xyflow/react";
import { WorkflowNodeCard } from "./WorkflowNodeCard";
import type { WorkflowStepStatus } from "../../../types/workflow";

export function WebhookNode({ selected, data }: NodeProps) {
  const url = typeof data.url === "string" ? data.url : "";
  return (
    <WorkflowNodeCard
      icon={<Webhook className="h-4 w-4" />}
      label="Call Webhook"
      subtitle={url || "Configure a target URL"}
      accentColor="#4fa3e3"
      status={data.status as WorkflowStepStatus | undefined}
      selected={selected}
    />
  );
}
