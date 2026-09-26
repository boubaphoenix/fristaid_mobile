import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { tokenStorage } from './tokenStorage';
import { setUnauthorizedHandler } from '@/lib/api';
import { logout as logoutApi } from '@/lib/authApi';

const TOKEN_KEY = 'africasecour_auth_token';

type AuthContextValue = {
  token: string | null;
  isLoading: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  // Vrai juste après une déconnexion automatique (token expiré/invalide
  // rejeté par l'API, voir setUnauthorizedHandler) — l'écran de connexion
  // l'affiche une fois puis l'efface, pour ne pas persister après un
  // login/logout normal ultérieur.
  sessionExpired: boolean;
  clearSessionExpired: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Garde de navigation (Phase 0.4) + intégration réelle (Phase 0.8) :
// signIn/signOut sont appelés par les écrans login/register après un
// POST /auth/login ou /auth/register réel. Le token est stocké de façon
// sécurisée côté mobile (jamais en clair).
export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    tokenStorage
      .getItemAsync(TOKEN_KEY)
      .then(setToken)
      .finally(() => setIsLoading(false));
  }, []);

  // Enregistré une seule fois : un 401 sur n'importe quel appel API
  // authentifié (token rejeté par requireAuth côté backend, voir
  // src/lib/api.ts) efface le token directement — la garde de navigation
  // existante ((tabs)/_layout.tsx, redirige si !token) renvoie alors seule
  // vers /(auth)/login, sans appel réseau supplémentaire (token déjà
  // invalide côté serveur).
  useEffect(() => {
    setUnauthorizedHandler(() => {
      tokenStorage.deleteItemAsync(TOKEN_KEY);
      setToken(null);
      setSessionExpired(true);
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      isLoading,
      sessionExpired,
      clearSessionExpired: () => setSessionExpired(false),
      signIn: async (newToken: string) => {
        await tokenStorage.setItemAsync(TOKEN_KEY, newToken);
        setToken(newToken);
      },
      signOut: async () => {
        // JWT sans état côté serveur : l'appel est best-effort (symétrie
        // API), la déconnexion locale ne doit jamais en dépendre.
        if (token) {
          await logoutApi(token).catch(() => {});
        }
        await tokenStorage.deleteItemAsync(TOKEN_KEY);
        setToken(null);
      },
    }),
    [token, isLoading, sessionExpired],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé à l’intérieur de <AuthProvider>');
  }
  return context;
}
