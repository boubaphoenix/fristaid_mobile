import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';

// Android-type Google OAuth clients only accept the "reversed client id"
// custom scheme as a redirect URI (com.googleusercontent.apps.<id>:/...),
// never the app's own scheme (fristaidmobile://) that expo-auth-session
// builds by default — Google rejects that with "Error 400: invalid_request
// — custom url scheme is not enabled for your android client". This scheme
// is also declared in app.json's `scheme` array so the native intent
// filter exists to actually receive the redirect.
const ANDROID_REDIRECT_SCHEME = GOOGLE_ANDROID_CLIENT_ID
  ? `com.googleusercontent.apps.${GOOGLE_ANDROID_CLIENT_ID.replace(/\.apps\.googleusercontent\.com$/, '')}`
  : undefined;

// Google Web-type clients only accept https:// redirect URIs, but a
// standalone/EAS Android build redirects via a custom scheme — Google
// rejects that at the authorization screen with "access blocked:
// authorization error" (redirect_uri_mismatch under the hood). A separate
// Android-type client (identified by package name + keystore SHA-1
// fingerprint, not a redirect URI) is required for native builds; the web
// client stays for `expo start --web`. `Google.useAuthRequest` picks the
// right one for the running platform when both are provided.
//
// Ne fonctionne que si au moins un des deux est renseigné (voir
// .env.local) — sinon le bouton Google reste désactivé sans planter
// l'app (voir plan §Google Cloud Console pour obtenir un Client ID).
//
// Les client ids doivent rester des chaînes vides (pas `undefined`) :
// passer `undefined` fait planter `Google.useAuthRequest` sur web avec
// "Client Id property `webClientId` must be defined". Mais une chaîne
// vide fait que `request` reste non-null (la lib ne valide pas le
// contenu, seulement `undefined`) — donc `isReady` ne peut pas se fier à
// `request` seul et doit vérifier explicitement qu'un client id est
// configuré.
export function useGoogleSignIn(
  onIdToken: (idToken: string) => void,
  onError: (message: string) => void,
) {
  const [request, response, promptAsync] = Google.useAuthRequest(
    {
      webClientId: GOOGLE_WEB_CLIENT_ID,
      androidClientId: GOOGLE_ANDROID_CLIENT_ID,
      responseType: 'id_token',
      scopes: ['openid', 'email', 'profile'],
    },
    Platform.OS === 'android' && ANDROID_REDIRECT_SCHEME
      ? { scheme: ANDROID_REDIRECT_SCHEME }
      : undefined,
  );

  useEffect(() => {
    if (!response) return;
    // Avec `responseType: 'id_token'`, Google renvoie l'id_token dans les
    // query params du redirect (`response.params.id_token`) — `response.
    // authentication` reste `null` tant qu'aucun `access_token` n'est
    // présent (voir expo-auth-session/build/AuthRequest.js), ce qui
    // n'arrive jamais avec ce responseType. Lire `authentication` d'abord
    // reste correct si le responseType change un jour pour `code`/`token`.
    const idToken = response.type === 'success' ? (response.authentication?.idToken ?? response.params?.id_token) : undefined;
    if (response.type === 'success' && idToken) {
      onIdToken(idToken);
    } else if (response.type === 'success') {
      onError('Réponse Google invalide, réessayez.');
    } else if (response.type === 'error') {
      const reason = response.error?.message ?? response.params?.error_description ?? response.params?.error;
      onError(reason ? `La connexion Google a échoué : ${reason}` : 'La connexion Google a échoué, réessayez.');
    }
    // response.type === 'cancel' / 'dismiss' : l'utilisateur a fermé la
    // popup volontairement, pas une erreur à afficher.
  }, [response]);

  return {
    promptAsync: () => promptAsync(),
    isReady: Boolean(GOOGLE_WEB_CLIENT_ID || GOOGLE_ANDROID_CLIENT_ID) && Boolean(request),
  };
}
