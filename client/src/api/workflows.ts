import { apiClient } from "./client";
import type {
  CreateWorkflowRequest,
  SetWorkflowEnabledRequest,
  UpdateWorkflowRequest,
  WorkflowDto,
  WorkflowSummaryDto,
} from "../types/workflow";

export async function getMyWorkflows(): Promise<WorkflowSummaryDto[]> {
  const { data } = await apiClient.get<WorkflowSummaryDto[]>("/workflows/mine");
  return data;
}

export async function createWorkflow(request: CreateWorkflowRequest): Promise<WorkflowDto> {
  const { data } = await apiClient.post<WorkflowDto>("/workflows", request);
  return data;
}

export async function getWorkflowById(id: string): Promise<WorkflowDto> {
  const { data } = await apiClient.get<WorkflowDto>(`/workflows/${id}`);
  return data;
}

export async function updateWorkflow(id: string, request: UpdateWorkflowRequest): Promise<WorkflowDto> {
  const { data } = await apiClient.patch<WorkflowDto>(`/workflows/${id}`, request);
  return data;
}

export async function setWorkflowEnabled(id: string, request: SetWorkflowEnabledRequest): Promise<WorkflowDto> {
  const { data } = await apiClient.patch<WorkflowDto>(`/workflows/${id}/enabled`, request);
  return data;
}

export async function deleteWorkflow(id: string): Promise<void> {
  await apiClient.delete(`/workflows/${id}`);
}
