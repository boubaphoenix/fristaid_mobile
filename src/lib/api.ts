import { Platform } from 'react-native';

// Le mobile ne parle jamais à Neon directement — uniquement à cette API
// (PRD §9/§17). En dev, l'API tourne en local ; EXPO_PUBLIC_API_URL permet
// de pointer vers un autre hôte (téléphone physique, staging) sans changer
// le code. Rien d'ici n'est un secret : c'est juste une URL publique.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

const isWeb = Platform.OS === 'web';

// Web uniquement : le cookie CSRF (non-HttpOnly, lisible en JS — voir
// fristaid-backend/src/lib/webAuthCookies.ts) doit être recopié dans un
// en-tête sur chaque requête mutante, pour prouver que la requête vient
// bien de notre propre JS et pas d'un site tiers qui ferait voyager le
// cookie HttpOnly automatiquement sans pouvoir le lire.
function readCsrfCookie(): string | null {
  if (!isWeb || typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )africasecour_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

// Évite que plusieurs 401 concurrents (plusieurs requêtes en vol au moment
// où le token d'accès expire) ne déclenchent plusieurs appels /auth/refresh
// en parallèle — un seul suffit, les autres attendent son résultat.
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessTokenOnce(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'X-Client': 'web', 'X-CSRF-Token': readCsrfCookie() ?? '' },
        });
        if (!res.ok) return null;
        const data = (await res.json().catch(() => null)) as { token?: string } | null;
        return data?.token ?? null;
      } catch {
        return null;
      }
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

// Une EXPO_PUBLIC_API_URL mal configurée en production (http:// au lieu de
// https://) enverrait le token d'authentification en clair sur le réseau.
if (!__DEV__ && !API_BASE_URL.startsWith('https://')) {
  throw new Error(`EXPO_PUBLIC_API_URL doit utiliser https:// en production (reçu : ${API_BASE_URL})`);
}

// Un token expiré/invalide (session JWT arrivée en fin de vie, ~30j) ne
// doit jamais laisser l'utilisateur bloqué sur un écran d'erreur qui se
// contente de rejouer la même requête avec le même token mort. AuthContext
// enregistre ici la fonction qui efface le token — dès qu'un 401 arrive
// pour une requête authentifiée, elle est appelée, et la garde de
// navigation déjà en place ((tabs)/_layout.tsx) renvoie automatiquement
// vers l'écran de connexion.
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler;
}

// Web uniquement : quand apiFetch rafraîchit silencieusement le token
// d'accès (cookie HttpOnly), AuthContext doit mettre à jour le token qu'il
// garde en mémoire — sinon le prochain appel renverrait l'ancien token déjà
// expiré et déclencherait un nouveau rafraîchissement à chaque requête au
// lieu d'une seule fois toutes les ~15 min.
let tokenRefreshedHandler: ((token: string) => void) | null = null;

export function setTokenRefreshedHandler(handler: (token: string) => void) {
  tokenRefreshedHandler = handler;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type ApiFetchOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  body?: unknown;
  token?: string | null;
};

const frenchErrorMap: Record<string, string> = {
  INVALID_CREDENTIALS: 'Adresse e-mail ou mot de passe incorrect.',
  PASSWORD_TOO_SHORT: 'Le mot de passe doit contenir au moins 10 caractères.',
  PASSWORD_BANNED: 'Ce mot de passe est trop simple ou trop courant.',
  PASSWORD_PWNED: 'Ce mot de passe a fuité dans une base de données compromise.',
  EMAIL_NOT_VERIFIED: 'Votre adresse e-mail n’est pas encore vérifiée.',
  ACCOUNT_SUSPENDED: 'Ce compte a été suspendu. Contactez le support.',
  LOCKED_OUT: 'Compte temporairement bloqué suite à plusieurs échecs. Réessayez plus tard.',
  TOO_MANY_LOGIN_ATTEMPTS: 'Trop de tentatives de connexion. Veuillez patienter.',
  TOO_MANY_SIGNUP_ATTEMPTS: 'Trop de tentatives d’inscription. Veuillez patienter.',
  TOO_MANY_VERIFY_ATTEMPTS: 'Trop de tentatives de vérification. Veuillez patienter.',
  VERIFICATION_CODE_INVALID: 'Le code de vérification est invalide.',
  VERIFICATION_CODE_EXPIRED: 'Le code de vérification a expiré.',
  PASSWORD_RESET_CODE_INVALID: 'Le code de réinitialisation est invalide.',
  PASSWORD_RESET_CODE_EXPIRED: 'Le code de réinitialisation a expiré.',
  TOO_MANY_RESET_ATTEMPTS: 'Trop de tentatives. Veuillez patienter.',
  VALIDATION_FAILED: 'Données invalides. Veuillez vérifier les informations saisies.',
};

async function doFetch(path: string, options: ApiFetchOptions, token: string | null | undefined): Promise<Response> {
  const method = options.method ?? 'GET';
  const isMutating = MUTATING_METHODS.has(method);
  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      method,
      ...(isWeb ? { credentials: 'include' } : {}),
      headers: {
        'Content-Type': 'application/json',
        ...(isWeb ? { 'X-Client': 'web' } : {}),
        ...(isWeb && isMutating ? { 'X-CSRF-Token': readCsrfCookie() ?? '' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Impossible de contacter le serveur backend. Vérifiez votre connexion.');
  }
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  let response = await doFetch(path, options, options.token);

  // Sur web, un 401 peut simplement vouloir dire que le token d'accès de
  // 15 min a expiré — on tente un rafraîchissement silencieux (cookie
  // HttpOnly) et on rejoue la requête une seule fois avant de considérer la
  // session comme vraiment morte. Le mobile n'a pas ce mécanisme (token de
  // 30 jours, pas de refresh token) : il va directement à unauthorizedHandler.
  if (response.status === 401 && options.token && isWeb) {
    const newToken = await refreshAccessTokenOnce();
    if (newToken) {
      tokenRefreshedHandler?.(newToken);
      response = await doFetch(path, options, newToken);
    }
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const code =
      typeof data?.error === 'string'
        ? data.error
        : (data?.error?.code ?? 'UNKNOWN_ERROR');

    const rawMessage =
      typeof data?.message === 'string'
        ? data.message
        : (data?.error?.message ?? "Une erreur inattendue s'est produite.");

    const message = frenchErrorMap[code] || rawMessage;

    // 401 sur une requête authentifiée == requireAuth a rejeté le token
    // (backend src/middleware/requireAuth.ts) : jamais renvoyé pour une
    // autre raison. Sans token envoyé (ex. tentative de connexion), un 401
    // veut juste dire "identifiants invalides" — pas une session à clore.
    // Sur web, on arrive ici seulement si le rafraîchissement a aussi
    // échoué (session vraiment expirée, pas juste le token d'accès).
    if (response.status === 401 && options.token) {
      unauthorizedHandler?.();
    }

    throw new ApiError(response.status, code, message);
  }

  return data as T;
}
