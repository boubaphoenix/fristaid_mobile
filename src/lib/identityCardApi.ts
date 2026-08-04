import { apiFetch } from './api';

export type IdentityCard = {
  display_name: string;
  avatar_url: string | null;
  title: string;
  level: number;
  completed_courses: number;
  badges_count: number;
  points_total: number;
  weekly_rank: number | null;
  member_since: string;
  generated_at: string;
};

export function getIdentityCard(token: string) {
  return apiFetch<IdentityCard>('/identity-card/me', { token });
}
