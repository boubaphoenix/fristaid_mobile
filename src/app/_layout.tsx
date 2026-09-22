import { Archivo_700Bold, Archivo_800ExtraBold, useFonts } from '@expo-google-fonts/archivo';
import { IBMPlexMono_400Regular, IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono';
import { IBMPlexSans_400Regular, IBMPlexSans_600SemiBold } from '@expo-google-fonts/ibm-plex-sans';
import { Slot } from 'expo-router';
import * as Sentry from '@sentry/react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { Screen, StateView } from '@/components/ui';
import { AuthProvider } from '@/context/AuthContext';
import { EmergencyContactsProvider } from '@/context/EmergencyContactsContext';

SplashScreen.preventAutoHideAsync();

if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    tracesSampleRate: Number(process.env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.2),
    sendDefaultPii: false,
  });
}

// Filet de sécurité au-delà des écrans qui gèrent déjà leurs propres
// erreurs réseau (via StateView) : une erreur de rendu React non
// rattrapée ailleurs (crash) affiche ceci au lieu d'un écran blanc.
// Sentry.wrap (plus bas) capture toujours l'événement ; ce composant
// ajoute juste une interface de secours avec un bouton "Réessayer".
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
        <Sentry.ErrorBoundary fallback={ErrorFallback}>
          <Slot />
        </Sentry.ErrorBoundary>
      </AuthProvider>
    </EmergencyContactsProvider>
  );
}

export default Sentry.wrap(RootLayout);
