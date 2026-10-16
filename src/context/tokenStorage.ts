import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// expo-secure-store n'a pas d'implémentation native web (module vide).
// Sur web (PWA), il n'y a plus de jeton lisible côté client à stocker : le
// refresh token vit dans un cookie HttpOnly posé par le backend (invisible
// en JS, voir fristaid-backend/src/lib/webAuthCookies.ts), et le token
// d'accès reste en mémoire React (AuthContext) sans jamais être persisté.
// Ces méthodes restent des no-op pour que AuthContext n'ait pas besoin de
// branche Platform.OS supplémentaire à ses points d'appel.
const webStorage = {
  getItemAsync: async () => null,
  setItemAsync: async () => {},
  deleteItemAsync: async () => {},
};

export const tokenStorage = Platform.OS === 'web' ? webStorage : SecureStore;
