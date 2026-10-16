import { apiFetch } from './api';

export type AuthUser = {
  id: string;
  email: string;
  role: string;
  email_verified: boolean;
  profile: {
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
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

// Web uniquement, appelé une fois au démarrage d'AuthContext : lit le
// refresh token dans le cookie HttpOnly (jamais envoyé explicitement ici,
// c'est le navigateur qui le fait via credentials: 'include') et renvoie un
// nouveau token d'accès. Une erreur ici veut simplement dire "pas de
// session active" — traité comme tel par l'appelant, quel que soit le
// code d'erreur exact (401 session absente, 403 CSRF si aucun cookie du
// tout n'existe encore).
export function refreshWebSession() {
  return apiFetch<{ token: string }>('/auth/refresh', { method: 'POST' });
}

export function fetchMe(token: string) {
  return apiFetch<AuthUser>('/auth/me', { token });
}

// Vérification d'e-mail et réinitialisation de mot de passe (Resend).
export function requestEmailVerification(token: string) {
  return apiFetch<{ sent: boolean; already_verified?: boolean }>('/auth/verify-email/request', {
    method: 'POST',
    token,
  });
}

export function confirmEmailVerification(token: string, code: string) {
  return apiFetch<{ user: AuthUser }>('/auth/verify-email/confirm', {
    method: 'POST',
    token,
    body: { code },
  });
}

export function requestPasswordReset(email: string) {
  return apiFetch<{ sent: boolean }>('/auth/password-reset/request', {
    method: 'POST',
    body: { email },
  });
}

export function confirmPasswordReset(email: string, code: string, new_password: string) {
  return apiFetch<AuthResponse>('/auth/password-reset/confirm', {
    method: 'POST',
    body: { email, code, new_password },
  });
}
