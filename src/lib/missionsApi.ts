import { apiFetch } from './api';

export type Mission = {
  id: string;
  course_id: string | null;
  title: string;
  description: string;
  points_reward: number;
  status: 'pending' | 'completed' | null;
};

export async function getMissions(token: string) {
  const { missions } = await apiFetch<{ missions: Mission[] }>('/missions', { token });
  return missions;
}
