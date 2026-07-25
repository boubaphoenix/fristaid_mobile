import { Link } from 'expo-router';
import { Text } from 'react-native';

import { PrimaryButton, Screen } from '@/components/ui';
import { typography } from '@/constants/theme';

// Point d'entrée du parcours SOS (mode stress) — pousse vers le stack
// modal (sos). Contenu réel des écrans 11-15 livré en Vague 1 (14) puis
// Vague 2 (11, 12, 13, 15).
export default function SosEntryScreen() {
  return (
    <Screen mode="normal">
      <Text style={typography.h2}>SOS (placeholder)</Text>
      <Text style={typography.body}>Contenu détaillé en Vague 1 et 2.</Text>
      <Link href="/(sos)/role" asChild>
        <PrimaryButton label="Démarrer le guidage SOS" onPress={() => {}} variant="danger" />
      </Link>
    </Screen>
  );
}
