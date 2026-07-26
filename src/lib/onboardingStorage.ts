import { tokenStorage } from '@/context/tokenStorage';

const ONBOARDING_SEEN_KEY = 'africasecour_onboarding_seen';

// Réutilise le même wrapper de stockage clé-valeur que le token d'auth
// (SecureStore natif, localStorage en repli web) — onboarding_seen n'est
// pas un secret, mais pas la peine d'ajouter une dépendance de stockage
// supplémentaire (ex. AsyncStorage) pour un simple flag.
export async function hasSeenOnboarding(): Promise<boolean> {
  const value = await tokenStorage.getItemAsync(ONBOARDING_SEEN_KEY);
  return value === 'true';
}

export async function markOnboardingSeen(): Promise<void> {
  await tokenStorage.setItemAsync(ONBOARDING_SEEN_KEY, 'true');
}
