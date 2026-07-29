import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';

// Ne fonctionne que si EXPO_PUBLIC_GOOGLE_CLIENT_ID est renseigné (voir
// .env.local) — sinon le bouton Google reste désactivé sans planter
// l'app (voir plan §Google Cloud Console pour obtenir un Client ID).
//
// Le client id doit rester une chaîne vide (pas `undefined`) : passer
// `undefined` fait planter `Google.useAuthRequest` sur web avec
// "Client Id property `webClientId` must be defined". Mais une chaîne
// vide fait que `request` reste non-null (la lib ne valide pas le
// contenu, seulement `undefined`) — donc `isReady` ne peut pas se fier à
// `request` seul et doit vérifier explicitement que le client id est
// configuré.
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
      onError('La connexion Google a échoué, réessayez.');
    }
    // response.type === 'cancel' / 'dismiss' : l'utilisateur a fermé la
    // popup volontairement, pas une erreur à afficher.
  }, [response]);

  return { promptAsync: () => promptAsync(), isReady: Boolean(GOOGLE_CLIENT_ID) && Boolean(request) };
}
