import { apiFetch } from './api';

export type UserReward = {
  id: string;
  reward_type: string;
  title: string;
  description: string;
  period_type: string | null;
  period_start: string | null;
  period_end: string | null;
  status: 'pending' | 'claimed' | 'revoked';
  awarded_at: string;
  claimed_at: string | null;
};

export async function getMyRewards(token: string) {
  const { rewards } = await apiFetch<{ rewards: UserReward[] }>('/rewards/me', { token });
  return rewards;
}
