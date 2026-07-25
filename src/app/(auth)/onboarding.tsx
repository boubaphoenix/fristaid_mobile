import { Link } from 'expo-router';
import { Text } from 'react-native';

import { Screen } from '@/components/ui';
import { typography } from '@/constants/theme';

// Placeholder — design pixel-perfect (carousel 3 slides) livré en Vague 4,
// écran 01. Pour l'instant, sert uniquement de point d'entrée du stack Auth.
export default function OnboardingScreen() {
  return (
    <Screen mode="normal">
      <Text style={typography.h2}>Onboarding (placeholder)</Text>
      <Text style={typography.body}>Contenu détaillé en Vague 4.</Text>
      <Link href="/(auth)/login">
        <Text style={typography.bodyBold}>Aller à la connexion</Text>
      </Link>
    </Screen>
  );
}
