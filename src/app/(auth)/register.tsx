import { Link } from 'expo-router';
import { Text } from 'react-native';

import { Screen } from '@/components/ui';
import { typography } from '@/constants/theme';

// Placeholder — formulaire réel (écran 02) livré en Vague 4. L'inscription
// fonctionnelle (POST /auth/register) arrive en Phase 0.8.
export default function RegisterScreen() {
  return (
    <Screen mode="normal">
      <Text style={typography.h2}>Inscription (placeholder)</Text>
      <Text style={typography.body}>Formulaire détaillé en Vague 4.</Text>
      <Link href="/(auth)/login">
        <Text style={typography.bodyBold}>J'ai déjà un compte</Text>
      </Link>
    </Screen>
  );
}
