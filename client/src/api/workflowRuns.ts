import { apiClient } from "./client";
import type { WorkflowRunDto } from "../types/workflow";

export async function triggerWorkflowRun(workflowId: string): Promise<WorkflowRunDto> {
  const { data } = await apiClient.post<WorkflowRunDto>(`/workflows/${workflowId}/runs`);
  return data;
}

export async function getWorkflowRunHistory(workflowId: string): Promise<WorkflowRunDto[]> {
  const { data } = await apiClient.get<WorkflowRunDto[]>(`/workflows/${workflowId}/runs`);
  return data;
}

export async function getWorkflowRunById(workflowId: string, runId: string): Promise<WorkflowRunDto> {
  const { data } = await apiClient.get<WorkflowRunDto>(`/workflows/${workflowId}/runs/${runId}`);
  return data;
}
