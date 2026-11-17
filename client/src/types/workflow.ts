export const WorkflowRunStatus = {
  Queued: 0,
  Running: 1,
  Succeeded: 2,
  Failed: 3,
} as const;

export type WorkflowRunStatus = (typeof WorkflowRunStatus)[keyof typeof WorkflowRunStatus];

export const WorkflowRunStatusLabels: Record<WorkflowRunStatus, string> = {
  [WorkflowRunStatus.Queued]: "Queued",
  [WorkflowRunStatus.Running]: "Running",
  [WorkflowRunStatus.Succeeded]: "Succeeded",
  [WorkflowRunStatus.Failed]: "Failed",
};

export const WorkflowRunStatusColors: Record<WorkflowRunStatus, string> = {
  [WorkflowRunStatus.Queued]: "#9e9e9e",
  [WorkflowRunStatus.Running]: "#2196f3",
  [WorkflowRunStatus.Succeeded]: "#4caf50",
  [WorkflowRunStatus.Failed]: "#ef5350",
};

export const WorkflowStepStatus = {
  Pending: 0,
  Running: 1,
  Succeeded: 2,
  Failed: 3,
  Skipped: 4,
} as const;

export type WorkflowStepStatus = (typeof WorkflowStepStatus)[keyof typeof WorkflowStepStatus];

export const WorkflowStepStatusLabels: Record<WorkflowStepStatus, string> = {
  [WorkflowStepStatus.Pending]: "Pending",
  [WorkflowStepStatus.Running]: "Running",
  [WorkflowStepStatus.Succeeded]: "Succeeded",
  [WorkflowStepStatus.Failed]: "Failed",
  [WorkflowStepStatus.Skipped]: "Skipped",
};

export const WorkflowStepStatusColors: Record<WorkflowStepStatus, string> = {
  [WorkflowStepStatus.Pending]: "#9e9e9e",
  [WorkflowStepStatus.Running]: "#2196f3",
  [WorkflowStepStatus.Succeeded]: "#4caf50",
  [WorkflowStepStatus.Failed]: "#ef5350",
  [WorkflowStepStatus.Skipped]: "#bdbdbd",
};

// Node type discriminators - shared between the canvas (React Flow node "type" field) and
// the backend executor's node dispatch switch. Keep these in sync with WorkflowRunExecutor.
export const WorkflowNodeType = {
  ManualTrigger: "manualTrigger",
  Notification: "notification",
  Webhook: "webhook",
  BoardTask: "boardTask",
  Condition: "condition",
  Code: "code",
  AiAgent: "aiAgent",
} as const;

export type WorkflowNodeType = (typeof WorkflowNodeType)[keyof typeof WorkflowNodeType];

export const ConditionOperator = {
  Equals: "equals",
  NotEquals: "notEquals",
  Contains: "contains",
  GreaterThan: "greaterThan",
  LessThan: "lessThan",
} as const;

export type ConditionOperator = (typeof ConditionOperator)[keyof typeof ConditionOperator];

export const ConditionOperatorLabels: Record<ConditionOperator, string> = {
  [ConditionOperator.Equals]: "equals",
  [ConditionOperator.NotEquals]: "does not equal",
  [ConditionOperator.Contains]: "contains",
  [ConditionOperator.GreaterThan]: "is greater than",
  [ConditionOperator.LessThan]: "is less than",
};

export interface WorkflowSummaryDto {
  id: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  ownerEmployeeId: string;
  ownerEmployeeName: string;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface WorkflowDto extends WorkflowSummaryDto {
  graphJson: string;
}

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
}

export interface UpdateWorkflowRequest {
  name: string;
  description?: string;
  graphJson: string;
}

export interface SetWorkflowEnabledRequest {
  isEnabled: boolean;
}

export interface WorkflowRunStepDto {
  id: string;
  nodeId: string;
  nodeType: string;
  status: WorkflowStepStatus;
  inputJson: string | null;
  outputJson: string | null;
  errorMessage: string | null;
  startedAtUtc: string | null;
  completedAtUtc: string | null;
  sequenceNumber: number;
}

export interface WorkflowRunDto {
  id: string;
  workflowId: string;
  status: WorkflowRunStatus;
  triggeredByEmployeeId: string;
  triggeredByEmployeeName: string;
  queuedAtUtc: string;
  startedAtUtc: string | null;
  completedAtUtc: string | null;
  errorMessage: string | null;
  steps: WorkflowRunStepDto[];
}

// Mirrors React Flow's own node/edge shape 1:1 (and the backend's WorkflowGraphDto) so no
// translation is needed between what the canvas holds and what gets persisted as GraphJson.
export interface WorkflowGraphNodeData {
  label?: string;
  [key: string]: unknown;
}

export interface WorkflowGraphNode {
  id: string;
  type: WorkflowNodeType;
  position: { x: number; y: number };
  data: WorkflowGraphNodeData;
}

export interface WorkflowGraphEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
}

export interface WorkflowGraph {
  nodes: WorkflowGraphNode[];
  edges: WorkflowGraphEdge[];
}
