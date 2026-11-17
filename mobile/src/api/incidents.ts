import { apiClient } from "./client";
import type { IncidentReportDto, SubmitIncidentReportRequest } from "../types/incidents";

export async function submitIncidentReport(request: SubmitIncidentReportRequest): Promise<IncidentReportDto> {
  const { data } = await apiClient.post<IncidentReportDto>("/incidents", request);
  return data;
}

export async function getMyIncidentReports(): Promise<IncidentReportDto[]> {
  const { data } = await apiClient.get<IncidentReportDto[]>("/incidents/mine");
  return data;
}
