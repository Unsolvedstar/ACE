export const LegalAppointmentType = {
  SiteManager: 0,
  ResponsibleEngineer: 1,
  HealthAndSafetyOfficer: 2,
  ComplianceOfficer: 3,
  CompetentPerson: 4,
  ShiftSupervisor: 5,
  Other: 6,
} as const;
export type LegalAppointmentType = (typeof LegalAppointmentType)[keyof typeof LegalAppointmentType];

export const LegalAppointmentTypeLabels: Record<LegalAppointmentType, string> = {
  [LegalAppointmentType.SiteManager]: "Site Manager",
  [LegalAppointmentType.ResponsibleEngineer]: "Responsible Engineer",
  [LegalAppointmentType.HealthAndSafetyOfficer]: "Health & Safety Officer",
  [LegalAppointmentType.ComplianceOfficer]: "Compliance Officer",
  [LegalAppointmentType.CompetentPerson]: "Competent Person",
  [LegalAppointmentType.ShiftSupervisor]: "Shift Supervisor",
  [LegalAppointmentType.Other]: "Other",
};

export const LegalAppointmentStatus = {
  Pending: 0,
  Active: 1,
  Rejected: 2,
  Revoked: 3,
} as const;
export type LegalAppointmentStatus = (typeof LegalAppointmentStatus)[keyof typeof LegalAppointmentStatus];

export const LegalAppointmentStatusLabels: Record<LegalAppointmentStatus, string> = {
  [LegalAppointmentStatus.Pending]: "Pending",
  [LegalAppointmentStatus.Active]: "Active",
  [LegalAppointmentStatus.Rejected]: "Rejected",
  [LegalAppointmentStatus.Revoked]: "Revoked",
};

export interface LegalAppointmentDto {
  id: string;
  employeeId: string;
  employeeName: string;
  appointmentType: LegalAppointmentType;
  appointedBy: string;
  description: string;
  validFrom: string;
  validTo: string;
  status: LegalAppointmentStatus;
  createdAtUtc: string;
  reviewedAtUtc: string | null;
  rejectionReason: string | null;
  revokedAtUtc: string | null;
  revokedNotes: string | null;
}

export interface SubmitLegalAppointmentRequest {
  appointmentType: LegalAppointmentType;
  appointedBy: string;
  description: string;
  validFrom: string;
  validTo: string;
}

export interface ReviewLegalAppointmentRequest {
  approve: boolean;
  rejectionReason?: string;
}

export interface RevokeLegalAppointmentRequest {
  revokedNotes?: string;
}
