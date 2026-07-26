import { Stack } from 'expo-router';

import { colors } from '@/constants/theme';

// Mode Normal : contrairement au stack SOS (Mode Stress, sans nav), les
// écrans de l'Académie gardent un bouton retour visible.
export default function AcademyLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitle: '',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.lightGray },
        headerTintColor: colors.trustBlue,
      }}
    />
  );
}
