import { Archivo_700Bold, Archivo_800ExtraBold, useFonts } from '@expo-google-fonts/archivo';
import { IBMPlexMono_400Regular, IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono';
import { IBMPlexSans_400Regular, IBMPlexSans_600SemiBold } from '@expo-google-fonts/ibm-plex-sans';
import { Slot } from 'expo-router';
import * as Sentry from '@sentry/react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

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
        <Slot />
      </AuthProvider>
    </EmergencyContactsProvider>
  );
}

export default Sentry.wrap(RootLayout);
