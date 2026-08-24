import { apiClient } from "./client";
import { BOARD_TASK_ATTACHMENT_ENTITY_TYPE, type AttachmentDto } from "../types/boards";

export async function getTaskAttachments(taskId: string): Promise<AttachmentDto[]> {
  const { data } = await apiClient.get<AttachmentDto[]>(`/attachments/${BOARD_TASK_ATTACHMENT_ENTITY_TYPE}/${taskId}`);
  return data;
}

export async function uploadTaskProof(
  taskId: string,
  file: { uri: string; name: string; type: string },
): Promise<AttachmentDto> {
  const formData = new FormData();
  // React Native's fetch/FormData accepts { uri, name, type } in place of a Blob.
  formData.append("file", file as unknown as Blob);

  const { data } = await apiClient.post<AttachmentDto>(
    `/attachments/${BOARD_TASK_ATTACHMENT_ENTITY_TYPE}/${taskId}`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
}
