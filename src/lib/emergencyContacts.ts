import { tokenStorage } from '@/context/tokenStorage';

// Numéros d'urgence — dashboard admin (voir plan dashboard admin,
// §Numéros d'urgence, priorité maximale). Endpoint public (pas de
// `apiFetch`/token : l'écran "Consignes sans compte" doit fonctionner
// pour un visiteur non connecté, voir emergency-guide.tsx).
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

const CACHE_KEY = 'emergency_contacts_cache_v1';

// Ultime repli local : utilisé UNIQUEMENT si l'API est injoignable ET
// qu'aucune valeur n'a jamais été mise en cache (ex. tout premier
// lancement hors-ligne) — jamais si une valeur distante existe, même
// périmée. Ne jamais retirer cette constante (voir urlSafety.ts).
export const FALLBACK_EMERGENCY_CONTACTS: Record<string, string> = { samu: '185' };

type EmergencyContactsCache = { contacts: Record<string, string>; cached_at: string };

export async function readCachedEmergencyContacts(): Promise<Record<string, string> | null> {
  const raw = await tokenStorage.getItemAsync(CACHE_KEY).catch(() => null);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as EmergencyContactsCache;
    return parsed.contacts ?? null;
  } catch {
    return null;
  }
}

async function writeCachedEmergencyContacts(contacts: Record<string, string>): Promise<void> {
  const payload: EmergencyContactsCache = { contacts, cached_at: new Date().toISOString() };
  await tokenStorage.setItemAsync(CACHE_KEY, JSON.stringify(payload)).catch(() => {});
}

// Récupère les numéros à jour depuis l'API, met le cache local à jour en
// cas de succès. Ne lève jamais — l'appelant décide du repli (cache puis
// FALLBACK_EMERGENCY_CONTACTS, voir EmergencyContactsContext).
export async function fetchEmergencyContacts(): Promise<Record<string, string> | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/config/emergency-contacts`);
    if (!response.ok) return null;
    const data = (await response.json()) as { contacts?: unknown };
    if (!data.contacts || typeof data.contacts !== 'object' || Array.isArray(data.contacts)) return null;
    const contacts = data.contacts as Record<string, string>;
    await writeCachedEmergencyContacts(contacts);
    return contacts;
  } catch {
    return null;
  }
}
