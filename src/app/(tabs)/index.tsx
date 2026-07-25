import { Text } from 'react-native';

import { Screen } from '@/components/ui';
import { typography } from '@/constants/theme';

// Placeholder — contenu réel (écran 04) livré en Vague 1.
export default function HomeScreen() {
  return (
    <Screen mode="normal">
      <Text style={typography.h2}>Accueil (placeholder)</Text>
      <Text style={typography.body}>Contenu détaillé en Vague 1.</Text>
    </Screen>
  );
}
