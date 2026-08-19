// Le mobile ne parle jamais à Neon directement — uniquement à cette API
// (PRD §9/§17). En dev, l'API tourne en local ; EXPO_PUBLIC_API_URL permet
// de pointer vers un autre hôte (téléphone physique, staging) sans changer
// le code. Rien d'ici n'est un secret : c'est juste une URL publique.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

// Une EXPO_PUBLIC_API_URL mal configurée en production (http:// au lieu de
// https://) enverrait le token d'authentification en clair sur le réseau.
if (!__DEV__ && !API_BASE_URL.startsWith('https://')) {
  throw new Error(`EXPO_PUBLIC_API_URL doit utiliser https:// en production (reçu : ${API_BASE_URL})`);
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

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Impossible de contacter le serveur backend. Vérifiez votre connexion.');
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
    throw new ApiError(response.status, code, message);
  }

  return data as T;
}
