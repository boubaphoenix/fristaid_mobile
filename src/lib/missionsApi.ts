import { apiFetch } from './api';

export type Mission = {
  id: string;
  course_id: string | null;
  title: string;
  description: string;
  points_reward: number;
  status: 'pending' | 'completed' | null;
  note: string | null;
};

export type MissionBadge = {
  id: string;
  course_id: string;
  title: string;
  description: string;
  icon_url: string | null;
};

export type CompleteMissionResult = {
  status: 'completed';
  completed_at: string;
  points_awarded: number;
  badge: MissionBadge | null;
};

export async function getMissions(token: string) {
  const { missions } = await apiFetch<{ missions: Mission[] }>('/missions', { token });
  return missions;
}

export function completeMission(token: string, missionId: string, note?: string) {
  const trimmed = note?.trim();
  return apiFetch<CompleteMissionResult>(`/missions/${missionId}/complete`, {
    method: 'POST',
    token,
    body: trimmed ? { note: trimmed } : undefined,
  });
}
