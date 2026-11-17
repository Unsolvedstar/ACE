import type { NodeTypes } from "@xyflow/react";
import { WorkflowNodeType } from "../../../types/workflow";
import { TriggerNode } from "./TriggerNode";
import { NotificationNode } from "./NotificationNode";
import { WebhookNode } from "./WebhookNode";
import { BoardTaskNode } from "./BoardTaskNode";
import { ConditionNode } from "./ConditionNode";
import { CodeNode } from "./CodeNode";
import { AiAgentNode } from "./AiAgentNode";

export const workflowNodeTypes: NodeTypes = {
  [WorkflowNodeType.ManualTrigger]: TriggerNode,
  [WorkflowNodeType.Notification]: NotificationNode,
  [WorkflowNodeType.Webhook]: WebhookNode,
  [WorkflowNodeType.BoardTask]: BoardTaskNode,
  [WorkflowNodeType.Condition]: ConditionNode,
  [WorkflowNodeType.Code]: CodeNode,
  [WorkflowNodeType.AiAgent]: AiAgentNode,
};
