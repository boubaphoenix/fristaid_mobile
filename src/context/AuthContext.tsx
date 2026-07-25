import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { tokenStorage } from './tokenStorage';

const TOKEN_KEY = 'africasecour_auth_token';

type AuthContextValue = {
  token: string | null;
  isLoading: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Fondation de la garde de navigation (Phase 0.4). Le token est stocké de
// façon sécurisée côté mobile (jamais en clair) ; l'appel réseau qui
// l'obtient (POST /auth/login, /auth/register) arrive en Phase 0.8.
export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    tokenStorage
      .getItemAsync(TOKEN_KEY)
      .then(setToken)
      .finally(() => setIsLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      isLoading,
      signIn: async (newToken: string) => {
        await tokenStorage.setItemAsync(TOKEN_KEY, newToken);
        setToken(newToken);
      },
      signOut: async () => {
        await tokenStorage.deleteItemAsync(TOKEN_KEY);
        setToken(null);
      },
    }),
    [token, isLoading],
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
