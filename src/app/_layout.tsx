import { Archivo_700Bold, Archivo_800ExtraBold, useFonts } from '@expo-google-fonts/archivo';
import { IBMPlexMono_400Regular, IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono';
import { IBMPlexSans_400Regular, IBMPlexSans_600SemiBold } from '@expo-google-fonts/ibm-plex-sans';
import { Slot } from 'expo-router';
import Head from 'expo-router/head';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { Screen, StateView } from '@/components/ui';
import { UpdateBanner } from '@/components/UpdateBanner';
import { AuthProvider } from '@/context/AuthContext';
import { EmergencyContactsProvider } from '@/context/EmergencyContactsContext';
import { MonitoringBoundary, startMonitoring, wrapRoot } from '@/lib/monitoring';

// Ferme la popup Google Sign-In dès que la redirection d'authentification
// atterrit dessus, au lieu de laisser l'app entière s'y afficher. Pas de
// vérification `window.opener` : testée en conditions réelles, elle empêchait
// ce code de s'exécuter dans la popup. `window.close()` ne fait rien (sans
// erreur) sur un onglet qui n'a pas été ouvert par script.
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const href = window.location.href;
  const isOAuthRedirect =
    href.includes('id_token=') || href.includes('access_token=') || href.includes('code=');

  if (isOAuthRedirect) {
    try {
      if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel('africasecour_oauth_channel');
        channel.postMessage({ url: href });
        channel.close();
      }
    } catch {}

    try {
      window.localStorage.setItem(
        'africasecour_oauth_response',
        JSON.stringify({ url: href, time: Date.now() }),
      );
    } catch {}

    try {
      WebBrowser.maybeCompleteAuthSession({ skipRedirectCheck: true });
    } catch {}

    try {
      window.close();
    } catch {}
  }
}

SplashScreen.preventAutoHideAsync();
startMonitoring();

// Filet de sécurité au-delà des écrans qui gèrent déjà leurs propres
// erreurs réseau (via StateView) : une erreur de rendu React non rattrapée
// ailleurs (crash) affiche ceci au lieu d'un écran blanc.
function ErrorFallback({ resetError }: { resetError: () => void }) {
  return (
    <Screen mode="normal">
      <StateView
        state="error"
        title="Une erreur inattendue s'est produite"
        message="L'application a rencontré un problème. Réessayez — si ça persiste, redémarrez l'application."
        onRetry={resetError}
      />
    </Screen>
  );
}

function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Archivo_700Bold,
    Archivo_800ExtraBold,
    IBMPlexSans_400Regular,
    IBMPlexSans_600SemiBold,
    IBMPlexMono_400Regular,
    IBMPlexMono_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Si les polices échouent à charger (mémoire faible, asset corrompu), on
  // continue quand même avec les polices système plutôt que de rester
  // bloqué sur le splash indéfiniment.
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <EmergencyContactsProvider>
      <AuthProvider>
        {Platform.OS === 'web' ? (
          <Head>
            <title>AFRICASECOUR — Premiers secours qui sauvent</title>
          </Head>
        ) : null}
        <MonitoringBoundary fallback={ErrorFallback}>
          <UpdateBanner />
          <Slot />
        </MonitoringBoundary>
      </AuthProvider>
    </EmergencyContactsProvider>
  );
}

export default wrapRoot(RootLayout);
