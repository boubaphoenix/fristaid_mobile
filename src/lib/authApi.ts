import { apiFetch } from './api';

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  profile: {
    full_name: string | null;
    phone: string | null;
    points_total: number;
    reminders_enabled: boolean;
  };
};

type AuthResponse = { token: string; user: AuthUser };

export function registerAccount(email: string, password: string, full_name?: string, phone?: string) {
  return apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: { email, password, full_name, phone },
  });
}

export function login(email: string, password: string) {
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export function signInWithGoogle(id_token: string) {
  return apiFetch<AuthResponse>('/auth/google', {
    method: 'POST',
    body: { id_token },
  });
}

export function logout(token: string) {
  return apiFetch<{ success: true }>('/auth/logout', { method: 'POST', token });
}

export function fetchMe(token: string) {
  return apiFetch<AuthUser>('/auth/me', { token });
}
