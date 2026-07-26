import { Stack } from 'expo-router';

import { colors } from '@/constants/theme';

// Mode Normal, même pattern que academy/_layout.tsx : bouton retour visible.
export default function MissionsLayout() {
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
