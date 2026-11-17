export interface SpaceMemberDto {
  employeeId: string;
  employeeName: string;
  jobTitle: string;
  addedAtUtc: string;
}

export interface SpaceDto {
  id: string;
  name: string;
  description: string | null;
  ownerEmployeeId: string;
  ownerEmployeeName: string;
  siteId: string | null;
  siteName: string | null;
  isArchived: boolean;
  createdAtUtc: string;
  members: SpaceMemberDto[];
  folderCount: number;
  boardCount: number;
}

export interface CreateSpaceRequest {
  name: string;
  description?: string;
  siteId?: string;
  initialMemberEmployeeIds: string[];
}

export interface UpdateSpaceRequest {
  name: string;
  description?: string;
  isArchived: boolean;
}

export interface AddSpaceMemberRequest {
  employeeId: string;
}
