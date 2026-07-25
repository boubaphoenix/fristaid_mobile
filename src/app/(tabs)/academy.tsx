import { Text } from 'react-native';

import { Screen } from '@/components/ui';
import { typography } from '@/constants/theme';

// Placeholder — contenu réel (écrans 05-10) livré en Vague 3.
export default function AcademyScreen() {
  return (
    <Screen mode="normal">
      <Text style={typography.h2}>Académie (placeholder)</Text>
      <Text style={typography.body}>Contenu détaillé en Vague 3.</Text>
    </Screen>
  );
}
