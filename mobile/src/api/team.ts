import { apiClient } from "./client";
import type { TeamMember } from "../types/boards";

export async function getMyTeam(): Promise<TeamMember[]> {
  const { data } = await apiClient.get<TeamMember[]>("/team/mine");
  return data;
}
