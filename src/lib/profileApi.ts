import { apiFetch } from './api';
import type { AuthUser } from './authApi';

export function getProfile(token: string) {
  return apiFetch<AuthUser>('/profile/me', { token });
}

// full_name/phone sont verrouillés après l'inscription (backend
// validators/profile.ts) — plus jamais envoyés depuis ce fichier.
export type UpdateProfileInput = { avatar_url?: string | null };

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
