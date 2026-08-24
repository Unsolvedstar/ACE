export const BoardTaskStatus = {
  Todo: 0,
  InProgress: 1,
  Done: 2,
} as const;

export type BoardTaskStatus = (typeof BoardTaskStatus)[keyof typeof BoardTaskStatus];

export const BoardTaskStatusLabels: Record<BoardTaskStatus, string> = {
  [BoardTaskStatus.Todo]: "To Do",
  [BoardTaskStatus.InProgress]: "In Progress",
  [BoardTaskStatus.Done]: "Done",
};

export interface BoardMember {
  employeeId: string;
  employeeName: string;
  jobTitle: string;
  addedAtUtc: string;
}

export interface Board {
  id: string;
  name: string;
  description?: string | null;
  ownerEmployeeId: string;
  ownerEmployeeName: string;
  siteId?: string | null;
  siteName?: string | null;
  isArchived: boolean;
  createdAtUtc: string;
  members: BoardMember[];
}

export interface CreateBoardRequest {
  name: string;
  description?: string | null;
  siteId?: string | null;
  initialMemberEmployeeIds: string[];
}

export interface BoardTask {
  id: string;
  boardId: string;
  title: string;
  description?: string | null;
  assigneeEmployeeId?: string | null;
  assigneeEmployeeName?: string | null;
  createdByEmployeeId: string;
  createdByEmployeeName: string;
  status: BoardTaskStatus;
  dueDate?: string | null;
  createdAtUtc: string;
  completedAtUtc?: string | null;
}

export interface CreateBoardTaskRequest {
  title: string;
  description?: string | null;
  assigneeEmployeeId?: string | null;
  dueDate?: string | null;
}

export interface WeeklyTaskCompletion {
  employeeId: string;
  employeeName: string;
  tasksCompleted: number;
  tasksInProgress: number;
  tasksOverdue: number;
}

export interface TeamMember {
  id: string;
  employeeNumber: string;
  fullName: string;
  email: string;
  jobTitle: string;
  role: number;
  siteName: string;
  isActive: boolean;
}

export interface AttachmentDto {
  id: string;
  entityType: number;
  entityId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  uploadedByName: string;
  uploadedAtUtc: string;
}

export const BOARD_TASK_ATTACHMENT_ENTITY_TYPE = 6;
