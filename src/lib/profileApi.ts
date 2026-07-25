import { apiFetch } from './api';
import type { AuthUser } from './authApi';

export function getProfile(token: string) {
  return apiFetch<AuthUser>('/profile/me', { token });
}
