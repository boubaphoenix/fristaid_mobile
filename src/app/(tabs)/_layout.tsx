import { Redirect, Tabs } from 'expo-router';
import { View } from 'react-native';

import { brand, colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function TabsLayout() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: brand.cream }} />;
  }

  if (!token) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.trustBlue,
        tabBarInactiveTintColor: colors.mutedText,
      }}>
      <Tabs.Screen name="index" options={{ title: 'Accueil' }} />
      <Tabs.Screen name="academy" options={{ title: 'Académie' }} />
      <Tabs.Screen name="sos" options={{ title: 'SOS' }} />
      <Tabs.Screen name="missions" options={{ title: 'Missions' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
    </Tabs>
  );
}
