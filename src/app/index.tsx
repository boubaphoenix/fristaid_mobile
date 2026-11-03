import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { brand } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { hasSeenOnboarding } from '@/lib/onboardingStorage';

// Point d'entrée : redirige selon la présence d'un token stocké
// (Phase 0.4 — garde de navigation) et, si absent, selon le flag
// onboarding_seen (écran 01, Vague 4) pour ne jouer le carousel qu'une
// fois. L'écran de chargement reste blanc/neutre, pas de contenu à sauter.
export default function Index() {
  const { token, isLoading } = useAuth();
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);

  // Évite d'afficher l'accueil dans la popup Google Sign-In pendant le bref
  // instant avant qu'elle se ferme (voir src/app/_layout.tsx — pas de
  // vérification window.opener possible ici, coupée par COOP après
  // accounts.google.com même dans une vraie popup).
  if (
    typeof window !== 'undefined' &&
    (window.location.href.includes('id_token=') ||
      window.location.href.includes('access_token=') ||
      window.location.href.includes('code='))
  ) {
    return <View style={{ flex: 1, backgroundColor: brand.cream }} />;
  }

  useEffect(() => {
    if (token) return;
    hasSeenOnboarding().then(setOnboardingSeen);
  }, [token]);

  if (isLoading || (!token && onboardingSeen === null)) {
    return <View style={{ flex: 1, backgroundColor: brand.cream }} />;
  }

  if (token) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href={onboardingSeen ? '/(auth)/login' : '/(auth)/welcome'} />;
}
