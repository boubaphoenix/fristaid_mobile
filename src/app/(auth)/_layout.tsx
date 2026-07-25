import { Redirect, Stack } from 'expo-router';
import { View } from 'react-native';

import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function AuthLayout() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: colors.lightGray }} />;
  }

  if (token) {
    return <Redirect href="/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
