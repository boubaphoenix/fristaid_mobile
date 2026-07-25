import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

// Point d'entrée : redirige selon la présence d'un token stocké
// (Phase 0.4 — garde de navigation). L'écran de chargement le temps de
// résoudre le token reste blanc/neutre, pas de contenu à sauter.
export default function Index() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: colors.lightGray }} />;
  }

  return <Redirect href={token ? '/(tabs)/index' : '/(auth)/login'} />;
}
