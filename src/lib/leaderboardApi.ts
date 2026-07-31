import { apiFetch } from './api';

export type PeriodType = 'week' | 'month';

export type LeaderboardEntry = {
  rank: number;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  points: number;
  title: string;
  rank_title: string | null;
};

export type MyRankInfo = {
  rank: number;
  points: number;
  title: string;
  points_to_next_title: number | null;
  next_title: string | null;
  points_to_top100: number;
  rank_title: string | null;
  message: string;
};

export type LeaderboardResponse = {
  period: { type: PeriodType; start: string; end: string };
  entries: LeaderboardEntry[];
  me: MyRankInfo;
};

export type TitleTier = {
  title: string;
  level: number;
  min_points: number;
  max_points: number | null;
};

export function getWeeklyLeaderboard(token: string) {
  return apiFetch<LeaderboardResponse>('/leaderboard/week', { token });
}

export function getMonthlyLeaderboard(token: string) {
  return apiFetch<LeaderboardResponse>('/leaderboard/month', { token });
}

export async function getTitles(token: string) {
  const { titles } = await apiFetch<{ titles: TitleTier[] }>('/leaderboard/titles', { token });
  return titles;
}
