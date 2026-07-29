import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';

// Ne fonctionne que si EXPO_PUBLIC_GOOGLE_CLIENT_ID est renseigné (voir
// .env.local) — sinon `request` reste null et isReady est false, le
// bouton Google reste désactivé sans planter l'app (voir plan §Google
// Cloud Console pour obtenir un Client ID).
export function useGoogleSignIn(
  onIdToken: (idToken: string) => void,
  onError: (message: string) => void,
) {
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    responseType: 'id_token',
    scopes: ['openid', 'email', 'profile'],
  });

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success' && response.authentication?.idToken) {
      onIdToken(response.authentication.idToken);
    } else if (response.type === 'success') {
      onError('Réponse Google invalide, réessayez.');
    } else if (response.type === 'error') {
      onError('La connexion Google a échoué, réessayez.');
    }
    // response.type === 'cancel' / 'dismiss' : l'utilisateur a fermé la
    // popup volontairement, pas une erreur à afficher.
  }, [response]);

  return { promptAsync: () => promptAsync(), isReady: Boolean(request) };
}
