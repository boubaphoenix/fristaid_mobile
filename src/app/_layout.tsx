import { Archivo_700Bold, Archivo_800ExtraBold, useFonts } from '@expo-google-fonts/archivo';
import { IBMPlexMono_400Regular, IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono';
import { IBMPlexSans_400Regular, IBMPlexSans_600SemiBold } from '@expo-google-fonts/ibm-plex-sans';
import { Slot } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Archivo_700Bold,
    Archivo_800ExtraBold,
    IBMPlexSans_400Regular,
    IBMPlexSans_600SemiBold,
    IBMPlexMono_400Regular,
    IBMPlexMono_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return <Slot />;
}
