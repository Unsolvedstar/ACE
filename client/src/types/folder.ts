export interface FolderDto {
  id: string;
  spaceId: string;
  name: string;
  isArchived: boolean;
  createdAtUtc: string;
  boardCount: number;
}

export interface CreateFolderRequest {
  spaceId: string;
  name: string;
}

export interface UpdateFolderRequest {
  name: string;
  isArchived: boolean;
}
