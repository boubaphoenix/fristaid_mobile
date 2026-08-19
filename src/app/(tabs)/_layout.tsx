import { Redirect, Tabs } from 'expo-router';
import { View } from 'react-native';

import { FloatingTabBar } from '@/components/ui';
import { brand } from '@/constants/theme';
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
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <FloatingTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Accueil' }} />
      <Tabs.Screen name="academy" options={{ title: 'Académie' }} />
      <Tabs.Screen name="sos" options={{ title: 'SOS' }} />
      <Tabs.Screen name="kits" options={{ title: 'Kit secours' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
      {/* Route fichier toujours présente (src/app/(tabs)/missions/) mais
          retirée de la nav — href: null l'exclut de state.routes, sinon
          Expo Router l'ajoute automatiquement comme 6e onglet. */}
      <Tabs.Screen name="missions" options={{ href: null }} />
    </Tabs>
  );
}
