import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// expo-secure-store n'a pas d'implémentation native web (module vide).
// AFRICASECOUR ne cible pas le web en production (mobile only, PRD §9) ;
// ce repli localStorage sert uniquement au développement/preview web.
const webStorage = {
  getItemAsync: async (key: string) => globalThis.localStorage?.getItem(key) ?? null,
  setItemAsync: async (key: string, value: string) => globalThis.localStorage?.setItem(key, value),
  deleteItemAsync: async (key: string) => globalThis.localStorage?.removeItem(key),
};

export const tokenStorage = Platform.OS === 'web' ? webStorage : SecureStore;
