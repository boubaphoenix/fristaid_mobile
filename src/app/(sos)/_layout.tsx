import { Stack } from 'expo-router';

// Stack modal du parcours SOS — Mode Stress : pas de nav visible, pas
// d'en-tête, présentation plein écran. Les écrans 11-15 (Vagues 1 et 2)
// vivent ici.
export default function SosLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'fullScreenModal',
        animation: 'fade',
      }}
    />
  );
}
