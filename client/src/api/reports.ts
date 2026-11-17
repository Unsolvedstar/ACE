import { apiClient } from "./client";
import type { ReportsSummaryDto, SiteSafetyRiskDto } from "../types/reports";

export async function getReportsSummary(): Promise<ReportsSummaryDto> {
  const { data } = await apiClient.get<ReportsSummaryDto>("/reports/summary");
  return data;
}

export async function getSiteSafetyRisk(): Promise<SiteSafetyRiskDto[]> {
  const { data } = await apiClient.get<SiteSafetyRiskDto[]>("/reports/safety-risk");
  return data;
}
