import { keyValueStorage } from '@/lib/keyValueStorage';

const ONBOARDING_SEEN_KEY = 'africasecour_onboarding_seen';

// onboarding_seen n'est pas un secret — pas la peine d'ajouter une
// dépendance de stockage supplémentaire (ex. AsyncStorage) pour un simple
// flag (voir keyValueStorage.ts).
export async function hasSeenOnboarding(): Promise<boolean> {
  const value = await keyValueStorage.getItemAsync(ONBOARDING_SEEN_KEY);
  return value === 'true';
}

export async function markOnboardingSeen(): Promise<void> {
  await keyValueStorage.setItemAsync(ONBOARDING_SEEN_KEY, 'true');
}
