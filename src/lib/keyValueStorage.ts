import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Stockage clé-valeur générique pour des données NON sensibles (contraire
// de context/tokenStorage.ts, réservé au jeton d'auth) : flag d'onboarding,
// cache des numéros d'urgence. SecureStore sur natif (déjà présent, aucune
// raison de changer), localStorage sur web — contrairement au token d'auth,
// rien ici ne doit être protégé d'un script tiers sur la page.
const webStorage = {
  getItemAsync: async (key: string) => globalThis.localStorage?.getItem(key) ?? null,
  setItemAsync: async (key: string, value: string) => globalThis.localStorage?.setItem(key, value),
  deleteItemAsync: async (key: string) => globalThis.localStorage?.removeItem(key),
};

export const keyValueStorage = Platform.OS === 'web' ? webStorage : SecureStore;
