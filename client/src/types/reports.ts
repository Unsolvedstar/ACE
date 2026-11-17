import type { EmployeeRole } from "./auth";
import type { IncidentSeverity } from "./incident";

export interface RoleHeadcountDto {
  role: EmployeeRole;
  count: number;
}

export interface IncidentSeverityCountDto {
  severity: IncidentSeverity;
  count: number;
}

export const SafetyRiskBand = {
  Low: 0,
  Moderate: 1,
  Elevated: 2,
  Critical: 3,
} as const;
export type SafetyRiskBand = (typeof SafetyRiskBand)[keyof typeof SafetyRiskBand];

export const SafetyRiskBandLabels: Record<SafetyRiskBand, string> = {
  [SafetyRiskBand.Low]: "Low",
  [SafetyRiskBand.Moderate]: "Moderate",
  [SafetyRiskBand.Elevated]: "Elevated",
  [SafetyRiskBand.Critical]: "Critical",
};

export const SafetyRiskTrend = {
  Falling: 0,
  Stable: 1,
  Rising: 2,
} as const;
export type SafetyRiskTrend = (typeof SafetyRiskTrend)[keyof typeof SafetyRiskTrend];

export interface SiteSafetyRiskDto {
  siteId: string;
  siteName: string;
  score: number;
  band: SafetyRiskBand;
  trend: SafetyRiskTrend;
  activeEmployeeCount: number;
  incidentsLast30Days: number;
  incidentsPrior30Days: number;
  overduePpeRequests: number;
  certificatesExpiredOrDueSoon: number;
  contributors: string[];
}

export interface ReportsSummaryDto {
  totalEmployees: number;
  activeEmployees: number;
  headcountByRole: RoleHeadcountDto[];
  openIncidents: number;
  closedIncidents: number;
  openIncidentsBySeverity: IncidentSeverityCountDto[];
  pendingLeaveRequests: number;
  validCertificates: number;
  dueSoonCertificates: number;
  expiredCertificates: number;
  pendingPpeRequests: number;
  ppeAwaitingIssue: number;
  pendingLegalAppointments: number;
  activeLegalAppointments: number;
}
