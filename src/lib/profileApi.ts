import { apiFetch } from './api';
import type { AuthUser } from './authApi';

export function getProfile(token: string) {
  return apiFetch<AuthUser>('/profile/me', { token });
}

export type UpdateProfileInput = { full_name?: string; phone?: string; avatar_url?: string | null };

export function updateProfile(token: string, input: UpdateProfileInput) {
  return apiFetch<AuthUser>('/profile/me', { method: 'PATCH', token, body: input });
}

export function updateReminders(token: string, remindersEnabled: boolean) {
  return apiFetch<AuthUser>('/settings/reminders', {
    method: 'PATCH',
    token,
    body: { reminders_enabled: remindersEnabled },
  });
}
